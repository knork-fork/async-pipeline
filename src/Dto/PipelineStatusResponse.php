<?php

declare(strict_types=1);

namespace App\Dto;

final class PipelineStatusResponse
{
    /**
     * @param 'pending'|'in progress'|'failed'|'completed' $status
     * @param array{id: string, finished_at: string}|null  $lastCompletedStage
     */
    public function __construct(
        public readonly string $status,
        public readonly ?array $lastCompletedStage = null,
    ) {
    }
}
