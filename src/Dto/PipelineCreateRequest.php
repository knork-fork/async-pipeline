<?php

declare(strict_types=1);

namespace App\Dto;

final class PipelineCreateRequest
{
    /** @param array<mixed> $data */
    public function __construct(
        public readonly string $name,
        public readonly array $data = [],
    ) {
    }
}
