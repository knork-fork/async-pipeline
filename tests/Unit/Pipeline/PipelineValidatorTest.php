<?php

declare(strict_types=1);

namespace App\Tests\Unit\Pipeline;

use App\Service\PipelineValidator;
use App\Tests\Common\UnitTestCase;
use Symfony\Component\Yaml\Yaml;

/**
 * @internal
 */
final class PipelineValidatorTest extends UnitTestCase
{
    private const string FILES_DIR = __DIR__ . '/../../Files';

    private PipelineValidator $validator; // @phpstan-ignore property.uninitialized

    protected function setUp(): void
    {
        $this->validator = new PipelineValidator();
    }

    /**
     * Pipeline: start -> stage1 -> [stage2 | stage3] -> stage4 -> end
     * stage1 routes to stage2 on success, stage3 on failure.
     *
     * start provides: key_1, key_2, key_3
     * stage1 reads key_1, writes key_mid_stage
     * stage2 reads key_2
     * stage3 reads key_2
     * stage4 reads key_3, key_mid_stage; writes output_key
     * end expects: output_key
     *
     * On both execution paths, every provided key is consumed and every read key is available.
     */
    public function testPassingPipelineIsValid(): void
    {
        /** @var array<string, mixed> $pipeline */
        $pipeline = Yaml::parseFile(self::FILES_DIR . '/pipelines/base.yaml');
        $result = $this->validator->validate($pipeline, 'App\Tests\Files\Stages\Passing');

        self::assertTrue($result->isValid());
    }

    /**
     * Same pipeline as passing, but stage3 has an empty contract (reads nothing).
     *
     * On the fail path (start -> stage1 -> stage3 -> stage4 -> end),
     * key_2 is provided by start but never consumed by any stage.
     * Validator must reject: every key written on a path must be read on that same path.
     */
    public function testFailsWhenKeyUnusedOnPath(): void
    {
        /** @var array<string, mixed> $pipeline */
        $pipeline = Yaml::parseFile(self::FILES_DIR . '/pipelines/base.yaml');
        $result = $this->validator->validate($pipeline, 'App\Tests\Files\Stages\Failing1');

        self::assertFalse($result->isValid());
        self::assertNotEmpty($result->getErrors());
    }

    /**
     * Same pipeline as passing, but stage1 only reads key_1 and does NOT write key_mid_stage.
     *
     * stage4 reads key_mid_stage, which is never written by anyone.
     * Validator must reject: a stage cannot read a key that no upstream stage (or start) writes.
     */
    public function testFailsWhenKeyReadBeforeWritten(): void
    {
        /** @var array<string, mixed> $pipeline */
        $pipeline = Yaml::parseFile(self::FILES_DIR . '/pipelines/base.yaml');
        $result = $this->validator->validate($pipeline, 'App\Tests\Files\Stages\Failing2');

        self::assertFalse($result->isValid());
        self::assertNotEmpty($result->getErrors());
    }

    /**
     * Same stages as passing, but start provides an extra key_4 that no stage reads.
     *
     * On every execution path key_4 is written (by start) but never consumed.
     * Validator must reject: every key written on a path must be read on that same path.
     */
    public function testFailsWhenStartKeyNeverConsumed(): void
    {
        /** @var array<string, mixed> $pipeline */
        $pipeline = Yaml::parseFile(self::FILES_DIR . '/pipelines/failing3.yaml');
        $result = $this->validator->validate($pipeline, 'App\Tests\Files\Stages\Passing');

        self::assertFalse($result->isValid());
        self::assertNotEmpty($result->getErrors());
    }

    /**
     * Same pipeline structure as passing, but end expects output_secondary_key in addition to output_key.
     * stage2 writes output_secondary_key; stage3 does not.
     *
     * On the success path (stage2 runs) output_secondary_key is available.
     * On the fail path (stage3 runs) output_secondary_key is never written,
     * so end cannot receive it.
     * Validator must reject: branching matters — all paths must satisfy the end contract.
     */
    public function testFailsWhenEndKeyNotAvailableOnPath(): void
    {
        /** @var array<string, mixed> $pipeline */
        $pipeline = Yaml::parseFile(self::FILES_DIR . '/pipelines/failing4.yaml');
        $result = $this->validator->validate($pipeline, 'App\Tests\Files\Stages\Failing4');

        self::assertFalse($result->isValid());
        self::assertNotEmpty($result->getErrors());
    }

    /**
     * Pipeline has a start node and a stage node connected to it, but no end node.
     * Validator must reject: exactly one end node is required.
     */
    public function testFailsWhenNoEndNode(): void
    {
        /** @var array<string, mixed> $pipeline */
        $pipeline = Yaml::parseFile(self::FILES_DIR . '/pipelines/failing5.yaml');
        $result = $this->validator->validate($pipeline, 'App\Tests\Files\Stages\Failing5');

        self::assertFalse($result->isValid());
        self::assertNotEmpty($result->getErrors());
    }

    /**
     * Pipeline has a stage node connected to an end node, but no start node.
     * Validator must reject: exactly one start node is required.
     */
    public function testFailsWhenNoStartNode(): void
    {
        /** @var array<string, mixed> $pipeline */
        $pipeline = Yaml::parseFile(self::FILES_DIR . '/pipelines/failing6.yaml');
        $result = $this->validator->validate($pipeline, 'App\Tests\Files\Stages\Failing6');

        self::assertFalse($result->isValid());
        self::assertNotEmpty($result->getErrors());
    }

    /**
     * Pipeline: start -> stage1 -> end, plus stage2 with its output connected to end
     * but its input not connected to anything (dangling input pin).
     *
     * stage2 is not reachable from start.
     * Validator must reject: all nodes in the pipeline must be reachable from start.
     */
    public function testFailsWhenNodeNotReachableFromStart(): void
    {
        /** @var array<string, mixed> $pipeline */
        $pipeline = Yaml::parseFile(self::FILES_DIR . '/pipelines/failing7.yaml');
        $result = $this->validator->validate($pipeline, 'App\Tests\Files\Stages\Failing7');

        self::assertFalse($result->isValid());
        self::assertNotEmpty($result->getErrors());
    }

    /**
     * Pipeline: start -> stage1 (on_failure: route) -> end1 (OUT port) and end2 (FAIL port).
     * Both end nodes are reachable and both connections look valid in isolation,
     * but a pipeline must have exactly one end node.
     * Validator must reject: multiple end nodes are forbidden.
     */
    public function testFailsWhenMultipleEndNodes(): void
    {
        /** @var array<string, mixed> $pipeline */
        $pipeline = Yaml::parseFile(self::FILES_DIR . '/pipelines/failing8.yaml');
        $result = $this->validator->validate($pipeline, 'App\Tests\Files\Stages\Failing8');

        self::assertFalse($result->isValid());
        self::assertNotEmpty($result->getErrors());
    }

    /**
     * Pipeline contract expects key_1, key_2, key_3.
     * Providing exactly those keys must pass.
     */
    public function testPassesWhenInputDataMatchesContract(): void
    {
        /** @var array<string, mixed> $pipeline */
        $pipeline = Yaml::parseFile(self::FILES_DIR . '/pipelines/base.yaml');
        $result = $this->validator->validate(
            $pipeline,
            'App\Tests\Files\Stages\Passing',
            ['key_1' => 'a', 'key_2' => 'b', 'key_3' => 'c'],
        );

        self::assertTrue($result->isValid());
    }

    /**
     * Pipeline contract expects key_1, key_2, key_3.
     * Providing only a subset must fail.
     */
    public function testFailsWhenInputDataIsMissingContractKey(): void
    {
        /** @var array<string, mixed> $pipeline */
        $pipeline = Yaml::parseFile(self::FILES_DIR . '/pipelines/base.yaml');
        $result = $this->validator->validate(
            $pipeline,
            'App\Tests\Files\Stages\Passing',
            ['key_1' => 'a', 'key_2' => 'b'],
        );

        self::assertFalse($result->isValid());
        self::assertNotEmpty($result->getErrors());
    }

    /**
     * Pipeline contract expects key_1, key_2, key_3.
     * Providing an extra key not in the contract must fail.
     */
    public function testFailsWhenInputDataContainsExtraKey(): void
    {
        /** @var array<string, mixed> $pipeline */
        $pipeline = Yaml::parseFile(self::FILES_DIR . '/pipelines/base.yaml');
        $result = $this->validator->validate(
            $pipeline,
            'App\Tests\Files\Stages\Passing',
            ['key_1' => 'a', 'key_2' => 'b', 'key_3' => 'c', 'extra' => 'd'],
        );

        self::assertFalse($result->isValid());
        self::assertNotEmpty($result->getErrors());
    }
}
