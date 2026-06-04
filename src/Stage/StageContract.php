<?php

declare(strict_types=1);

namespace App\Stage;

final class StageContract
{
    private array $keys = [];

    public function addKey(string $key): self
    {
        $this->keys[] = $key;

        return $this;
    }

    public function getKeys(): array
    {
        return $this->keys;
    }
}
