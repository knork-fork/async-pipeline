<?php

declare(strict_types=1);

namespace App\Tests\Files\Stages\Failing4;

use App\Enum\KeyAccess;
use App\Stage\AbstractStage;
use App\Stage\StageContract;

final class Stage4 extends AbstractStage
{
    public function register(): StageContract
    {
        return new StageContract()
            ->addKey('key_3', KeyAccess::Read)
            ->addKey('key_mid_stage', KeyAccess::Read)
            ->addKey('output_key', KeyAccess::Write)
        ;
    }

    public function run(): void
    {
    }
}
