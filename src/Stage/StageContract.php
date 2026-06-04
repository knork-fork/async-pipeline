<?php

declare(strict_types=1);

namespace App\Stage;

final class StageContract
{
    /** @var list<string> */
    private array $keys = [];

    public function addKey(string $key): self
    {
        $this->keys[] = $key;

        return $this;
    }

    /** @return list<string> */
    public function getKeys(): array
    {
        return $this->keys;
    }
}
