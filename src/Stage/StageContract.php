<?php

declare(strict_types=1);

namespace App\Stage;

use App\Enum\KeyAccess;

final class StageContract
{
    /** @var list<string> */
    private array $readKeys = [];

    /** @var list<string> */
    private array $writeKeys = [];

    public function addKey(string $key, KeyAccess $access): self
    {
        if ($access === KeyAccess::Read) {
            $this->readKeys[] = $key;
        } else {
            $this->writeKeys[] = $key;
        }

        return $this;
    }

    /** @return list<string> */
    public function getReadKeys(): array
    {
        return $this->readKeys;
    }

    /** @return list<string> */
    public function getWriteKeys(): array
    {
        return $this->writeKeys;
    }
}
