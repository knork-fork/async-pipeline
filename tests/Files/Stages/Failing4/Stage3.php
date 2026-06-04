<?php

declare(strict_types=1);

namespace App\Tests\Files\Stages\Failing4;

use App\Enum\KeyAccess;
use App\Stage\AbstractStage;
use App\Stage\StageContract;

final class Stage3 extends AbstractStage
{
    public function register(): StageContract
    {
        return new StageContract()
            ->addKey('key_2', KeyAccess::Read)
        ;
    }

    public function run(): void
    {
    }
}
