<?php

declare(strict_types=1);

namespace App\Service;

use App\Pipeline\ValidationResult;
use App\Stage\AbstractStage;
use App\Stage\StageContract;
use App\Stage\WorkflowState;
use RuntimeException;

final class PipelineValidator implements PipelineValidatorInterface
{
    /**
     * @param array<string, mixed>      $pipeline
     * @param array<string, mixed>|null $inputData when provided, keys are checked against the start node contract
     */
    public function validate(array $pipeline, string $stageNamespace, ?array $inputData = null): ValidationResult
    {
        /** @var array<string, mixed> $graph */
        $graph = $pipeline['graph'] ?? [];
        /** @var list<array<string, mixed>> $rawNodes */
        $rawNodes = $graph['nodes'] ?? [];
        /** @var list<array<string, mixed>> $rawEdges */
        $rawEdges = $graph['edges'] ?? [];

        /** @var array<string, array<string, mixed>> $nodes */
        $nodes = [];
        foreach ($rawNodes as $node) {
            $nodeIdRaw = $node['id'] ?? null;
            $nodeId = \is_string($nodeIdRaw) ? $nodeIdRaw : '';
            if (isset($nodes[$nodeId])) {
                return ValidationResult::fail(\sprintf('Duplicate node ID: "%s".', $nodeId));
            }
            $nodes[$nodeId] = $node;
        }

        /**
         * @var list<array{from: array{node: string, port: string}, to: array{node: string, port: string}}> $edges
         */
        $edges = [];
        foreach ($rawEdges as $rawEdge) {
            /** @var array<string, mixed> $fromPart */
            $fromPart = $rawEdge['from'] ?? [];
            /** @var array<string, mixed> $toPart */
            $toPart = $rawEdge['to'] ?? [];
            $fromNodeRaw = $fromPart['node'] ?? null;
            $toNodeRaw = $toPart['node'] ?? null;
            $fromPortRaw = $fromPart['port'] ?? null;
            $toPortRaw = $toPart['port'] ?? null;
            $edges[] = [
                'from' => [
                    'node' => \is_string($fromNodeRaw) ? $fromNodeRaw : '',
                    'port' => \is_string($fromPortRaw) ? $fromPortRaw : '',
                ],
                'to' => [
                    'node' => \is_string($toNodeRaw) ? $toNodeRaw : '',
                    'port' => \is_string($toPortRaw) ? $toPortRaw : '',
                ],
            ];
        }

        foreach ($edges as $edge) {
            if (!isset($nodes[$edge['from']['node']])) {
                return ValidationResult::fail(\sprintf('Edge references unknown node "%s".', $edge['from']['node']));
            }
            if (!isset($nodes[$edge['to']['node']])) {
                return ValidationResult::fail(\sprintf('Edge references unknown node "%s".', $edge['to']['node']));
            }
        }

        /** @var array<string, true> $seenOutputPins */
        $seenOutputPins = [];
        foreach ($edges as $edge) {
            $pin = $edge['from']['node'] . ':' . $edge['from']['port'];
            if (isset($seenOutputPins[$pin])) {
                return ValidationResult::fail(\sprintf(
                    'Output pin "%s" on node "%s" has more than one connection.',
                    $edge['from']['port'],
                    $edge['from']['node'],
                ));
            }
            $seenOutputPins[$pin] = true;
        }

        /** @var array<string, list<string>> $adj */
        $adj = array_fill_keys(array_keys($nodes), []);
        /** @var array<string, list<string>> $reverseAdj */
        $reverseAdj = array_fill_keys(array_keys($nodes), []);
        foreach ($edges as $edge) {
            $from = $edge['from']['node'];
            $to = $edge['to']['node'];
            if (!\in_array($to, $adj[$from], true)) {
                $adj[$from][] = $to;
            }
            if (!\in_array($from, $reverseAdj[$to], true)) {
                $reverseAdj[$to][] = $from;
            }
        }

        $startId = null;
        $endId = null;
        $startCount = 0;
        $endCount = 0;
        foreach ($nodes as $id => $node) {
            if ($node['type'] === 'start') {
                $startId = $id;
                ++$startCount;
            }
            if ($node['type'] === 'end') {
                $endId = $id;
                ++$endCount;
            }
        }

        if ($startCount !== 1) {
            return ValidationResult::fail(\sprintf('Pipeline must have exactly one start node, found %d.', $startCount));
        }
        if ($endCount !== 1) {
            return ValidationResult::fail(\sprintf('Pipeline must have exactly one end node, found %d.', $endCount));
        }

        \assert($startId !== null);
        \assert($endId !== null);

        $result = $this->checkNoCycles($nodes, $adj);
        if (!$result->isValid()) {
            return $result;
        }

        $result = $this->checkAllReachableFromStart($startId, $nodes, $adj);
        if (!$result->isValid()) {
            return $result;
        }

        $result = $this->checkAllHavePathToEnd($endId, $nodes, $reverseAdj);
        if (!$result->isValid()) {
            return $result;
        }

        try {
            $contracts = $this->resolveContracts($nodes, $stageNamespace);
        } catch (RuntimeException $e) {
            return ValidationResult::fail($e->getMessage());
        }

        /** @var array<string, mixed> $startConfig */
        $startConfig = $nodes[$startId]['config'] ?? [];
        /** @var list<string> $startKeys */
        $startKeys = $startConfig['keys'] ?? [];

        /** @var array<string, mixed> $endConfig */
        $endConfig = $nodes[$endId]['config'] ?? [];
        /** @var list<string> $endKeys */
        $endKeys = $endConfig['keys'] ?? [];

        $paths = $this->enumeratePaths($startId, [], [], $endId, $adj);

        foreach ($paths as $path) {
            $result = $this->validatePath($path, $startKeys, $endKeys, $contracts);
            if (!$result->isValid()) {
                return $result;
            }
        }

        if ($inputData !== null) {
            $providedKeys = array_keys($inputData);
            sort($providedKeys);
            $expectedKeys = $startKeys;
            sort($expectedKeys);

            if ($providedKeys !== $expectedKeys) {
                return ValidationResult::fail(\sprintf(
                    'Input data keys [%s] do not match pipeline contract [%s].',
                    implode(', ', $providedKeys),
                    implode(', ', $expectedKeys),
                ));
            }
        }

        return ValidationResult::pass();
    }

    /**
     * @param array<string, array<string, mixed>> $nodes
     * @param array<string, list<string>>         $adj
     */
    private function checkNoCycles(array $nodes, array $adj): ValidationResult
    {
        /** @var array<string, string> $colors */
        $colors = array_fill_keys(array_keys($nodes), 'white');

        foreach (array_keys($nodes) as $nodeId) {
            if ($colors[$nodeId] === 'white') {
                $cycle = $this->dfsForCycle($nodeId, $colors, $adj);
                if ($cycle !== null) {
                    return ValidationResult::fail(\sprintf('Pipeline contains a cycle involving node "%s".', $cycle));
                }
            }
        }

        return ValidationResult::pass();
    }

    /**
     * @param array<string, string>       $colors
     * @param array<string, list<string>> $adj
     */
    private function dfsForCycle(string $nodeId, array &$colors, array $adj): ?string
    {
        $colors[$nodeId] = 'grey';

        foreach ($adj[$nodeId] as $successor) {
            if ($colors[$successor] === 'grey') {
                return $successor;
            }
            if ($colors[$successor] === 'white') {
                $cycle = $this->dfsForCycle($successor, $colors, $adj);
                if ($cycle !== null) {
                    return $cycle;
                }
            }
        }

        $colors[$nodeId] = 'black';

        return null;
    }

    /**
     * @param array<string, array<string, mixed>> $nodes
     * @param array<string, list<string>>         $adj
     */
    private function checkAllReachableFromStart(string $startId, array $nodes, array $adj): ValidationResult
    {
        $visited = [];
        $this->dfsVisit($startId, $adj, $visited);

        foreach (array_keys($nodes) as $nodeId) {
            if (!isset($visited[$nodeId])) {
                return ValidationResult::fail(\sprintf('Node "%s" is not reachable from start.', $nodeId));
            }
        }

        return ValidationResult::pass();
    }

    /**
     * @param array<string, array<string, mixed>> $nodes
     * @param array<string, list<string>>         $reverseAdj
     */
    private function checkAllHavePathToEnd(string $endId, array $nodes, array $reverseAdj): ValidationResult
    {
        $visited = [];
        $this->dfsVisit($endId, $reverseAdj, $visited);

        foreach (array_keys($nodes) as $nodeId) {
            if (!isset($visited[$nodeId])) {
                return ValidationResult::fail(\sprintf('Node "%s" has no path to end.', $nodeId));
            }
        }

        return ValidationResult::pass();
    }

    /**
     * @param array<string, list<string>> $adj
     * @param array<string, true>         $visited
     */
    private function dfsVisit(string $nodeId, array $adj, array &$visited): void
    {
        $visited[$nodeId] = true;
        foreach ($adj[$nodeId] as $successor) {
            if (!isset($visited[$successor])) {
                $this->dfsVisit($successor, $adj, $visited);
            }
        }
    }

    /**
     * @param array<string, array<string, mixed>> $nodes
     *
     * @return array<string, StageContract>
     */
    private function resolveContracts(array $nodes, string $stageNamespace): array
    {
        $contracts = [];

        foreach ($nodes as $id => $node) {
            if ($node['type'] !== 'stage') {
                continue;
            }

            $stageRaw = $node['stage'] ?? null;
            $stageName = \is_string($stageRaw) ? $stageRaw : '';
            $class = $stageNamespace . '\\' . $stageName;

            if (!class_exists($class)) {
                throw new RuntimeException(\sprintf('Stage class not found: "%s".', $class));
            }

            $instance = new $class(new WorkflowState());

            if (!$instance instanceof AbstractStage) {
                throw new RuntimeException(\sprintf('Stage class "%s" must extend AbstractStage.', $class));
            }

            $contracts[$id] = $instance->register();
        }

        return $contracts;
    }

    /**
     * @param list<string>                $currentPath
     * @param array<string, true>         $visitedOnPath
     * @param array<string, list<string>> $adj
     *
     * @return list<list<string>>
     */
    private function enumeratePaths(string $nodeId, array $currentPath, array $visitedOnPath, string $endId, array $adj): array
    {
        if ($nodeId === $endId) {
            return [array_merge($currentPath, [$nodeId])];
        }

        $currentPath[] = $nodeId;
        $visitedOnPath[$nodeId] = true;
        $paths = [];

        foreach ($adj[$nodeId] as $successor) {
            if (isset($visitedOnPath[$successor])) {
                continue;
            }
            $paths = array_merge($paths, $this->enumeratePaths($successor, $currentPath, $visitedOnPath, $endId, $adj));
        }

        return $paths;
    }

    /**
     * @param list<string>                 $path
     * @param list<string>                 $startKeys
     * @param list<string>                 $endKeys
     * @param array<string, StageContract> $contracts
     */
    private function validatePath(array $path, array $startKeys, array $endKeys, array $contracts): ValidationResult
    {
        /** @var array<string, bool> $available */
        $available = array_fill_keys($startKeys, true);
        /** @var array<string, bool> $written */
        $written = array_fill_keys($startKeys, true);
        /** @var array<string, true> $consumed */
        $consumed = [];

        $stageNodes = \array_slice($path, 1, \count($path) - 2);

        foreach ($stageNodes as $nodeId) {
            if (!isset($contracts[$nodeId])) {
                continue;
            }

            $contract = $contracts[$nodeId];

            foreach ($contract->getReadKeys() as $key) {
                if (!isset($available[$key])) {
                    return ValidationResult::fail(\sprintf(
                        'Stage "%s" reads key "%s" which is not available on path [%s].',
                        $nodeId,
                        $key,
                        implode(' → ', $path),
                    ));
                }
                $consumed[$key] = true;
            }

            foreach ($contract->getWriteKeys() as $key) {
                $available[$key] = true;
                $written[$key] = true;
            }
        }

        foreach ($endKeys as $key) {
            if (!isset($available[$key])) {
                return ValidationResult::fail(\sprintf(
                    'End node expects key "%s" which is not available on path [%s].',
                    $key,
                    implode(' → ', $path),
                ));
            }
            $consumed[$key] = true;
        }

        $unusedWrites = array_diff_key($written, $consumed);
        if ($unusedWrites !== []) {
            return ValidationResult::fail(\sprintf(
                'Key(s) "%s" written but not consumed on path [%s].',
                implode('", "', array_keys($unusedWrites)),
                implode(' → ', $path),
            ));
        }

        return ValidationResult::pass();
    }
}
