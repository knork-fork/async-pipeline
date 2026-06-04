<?php

declare(strict_types=1);

namespace App\Stage;

final class Stage3 extends AbstractStage
{
    public function register(): StageContract
    {
        return new StageContract();
    }

    public function run(): void
    {
    }
}
