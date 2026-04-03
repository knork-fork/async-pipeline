<?php

declare(strict_types=1);

namespace App\Dto;

final class PipelineCreateResponse
{
    public function __construct(
        public readonly int $id,
    ) {
    }
}
