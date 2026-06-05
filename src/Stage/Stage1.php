<?php

declare(strict_types=1);

namespace App\Stage;

use App\Enum\KeyAccess;

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
