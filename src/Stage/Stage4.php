<?php

declare(strict_types=1);

namespace App\Stage;

use App\Enum\KeyAccess;

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
