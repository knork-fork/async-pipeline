<?php

declare(strict_types=1);

namespace App\Pipeline;

final class ValidationResult
{
    /** @param list<string> $errors */
    private function __construct(
        private readonly bool $valid,
        private readonly array $errors,
    ) {
    }

    public static function pass(): self
    {
        return new self(true, []);
    }

    public static function fail(string ...$errors): self
    {
        return new self(false, array_values($errors));
    }

    public function isValid(): bool
    {
        return $this->valid;
    }

    /** @return list<string> */
    public function getErrors(): array
    {
        return $this->errors;
    }
}
