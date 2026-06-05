<?php

declare(strict_types=1);

namespace App\Service;

use App\Pipeline\ValidationResult;

interface PipelineValidatorInterface
{
    /**
     * @param array<string, mixed>      $pipeline
     * @param array<string, mixed>|null $inputData when provided, keys are checked against the start node contract
     */
    public function validate(array $pipeline, string $stageNamespace, ?array $inputData = null): ValidationResult;
}
