<?php

declare(strict_types=1);

namespace App\Stage;

use App\Exception\UnauthorizedKeyAccessException;

abstract class AbstractStage
{
    private StageContract $contract;

    public function __construct(private readonly WorkflowState $workflowState)
    {
        $this->contract = $this->register();
    }

    abstract public function register(): StageContract;

    abstract public function run(): void;

    protected function read(string $key): mixed
    {
        if (!\in_array($key, $this->contract->getReadKeys(), true)) {
            throw new UnauthorizedKeyAccessException(\sprintf('Key "%s" is not registered for reading.', $key));
        }

        return $this->workflowState->get($key);
    }

    protected function write(string $key, mixed $value): void
    {
        if (!\in_array($key, $this->contract->getWriteKeys(), true)) {
            throw new UnauthorizedKeyAccessException(\sprintf('Key "%s" is not registered for writing.', $key));
        }

        $this->workflowState->set($key, $value);
    }

    protected function has(string $key): bool
    {
        if (!\in_array($key, $this->contract->getReadKeys(), true)) {
            throw new UnauthorizedKeyAccessException(\sprintf('Key "%s" is not registered for reading.', $key));
        }

        return $this->workflowState->has($key);
    }
}
