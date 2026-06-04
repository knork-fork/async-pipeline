<?php

declare(strict_types=1);

namespace App\Tests\Files\Stages\Passing;

use App\Enum\KeyAccess;
use App\Stage\AbstractStage;
use App\Stage\StageContract;

final class Stage1 extends AbstractStage
{
    public function register(): StageContract
    {
        return new StageContract()
            ->addKey('key_1', KeyAccess::Read)
            ->addKey('key_mid_stage', KeyAccess::Write)
        ;
    }

    public function run(): void
    {
    }
}
