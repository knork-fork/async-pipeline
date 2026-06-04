<?php

declare(strict_types=1);

namespace App\Tests\Files\Stages\Failing7;

use App\Stage\AbstractStage;
use App\Stage\StageContract;

final class Stage1 extends AbstractStage
{
    public function register(): StageContract
    {
        return new StageContract();
    }

    public function run(): void
    {
    }
}
