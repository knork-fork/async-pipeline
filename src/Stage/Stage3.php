<?php

declare(strict_types=1);

namespace App\Stage;

use App\Enum\KeyAccess;

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
