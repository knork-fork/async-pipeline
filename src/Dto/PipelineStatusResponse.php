<?php

declare(strict_types=1);

namespace App\Dto;

use App\Enum\PipelineStatus;

final class PipelineStatusResponse
{
    /** @param array{id: string, finished_at: string}|null $lastCompletedStage */
    public function __construct(
        public readonly PipelineStatus $status,
        public readonly ?array $lastCompletedStage = null,
    ) {
    }
}
