<?php

declare(strict_types=1);

namespace App\Tests\Files\Stages\Failing2;

use App\Enum\KeyAccess;
use App\Stage\AbstractStage;
use App\Stage\StageContract;

final class Stage1 extends AbstractStage
{
    public function register(): StageContract
    {
        return new StageContract()
            ->addKey('key_1', KeyAccess::Read)
        ;
    }

    public function run(): void
    {
    }
}
