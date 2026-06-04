<?php

declare(strict_types=1);

namespace App\Stage;

abstract class AbstractStage
{
    abstract public function register(): StageContract;

    abstract public function run(): void;
}
