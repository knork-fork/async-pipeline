<?php

declare(strict_types=1);

namespace App\Tests\Unit\Stage;

use App\Enum\KeyAccess;
use App\Exception\UnauthorizedKeyAccessException;
use App\Stage\AbstractStage;
use App\Stage\StageContract;
use App\Stage\WorkflowState;
use App\Tests\Common\UnitTestCase;

/**
 * @internal
 */
final class GenericStageTest extends UnitTestCase
{
    public function testReadRegisteredKeyDoesNotThrow(): void
    {
        $stage = new class(new WorkflowState()) extends AbstractStage {
            public function register(): StageContract
            {
                return new StageContract()->addKey('foo', KeyAccess::Read);
            }

            public function run(): void
            {
                $this->read('foo');
            }
        };

        $stage->run();
        self::addToAssertionCount(1);
    }

    public function testWriteRegisteredKeyDoesNotThrow(): void
    {
        $stage = new class(new WorkflowState()) extends AbstractStage {
            public function register(): StageContract
            {
                return new StageContract()->addKey('bar', KeyAccess::Write);
            }

            public function run(): void
            {
                $this->write('bar', 'value');
            }
        };

        $stage->run();
        self::addToAssertionCount(1);
    }

    public function testReadUnregisteredKeyThrows(): void
    {
        $stage = new class(new WorkflowState()) extends AbstractStage {
            public function register(): StageContract
            {
                return new StageContract();
            }

            public function run(): void
            {
                $this->read('missing');
            }
        };

        $this->expectException(UnauthorizedKeyAccessException::class);
        $stage->run();
    }

    public function testWriteUnregisteredKeyThrows(): void
    {
        $stage = new class(new WorkflowState()) extends AbstractStage {
            public function register(): StageContract
            {
                return new StageContract();
            }

            public function run(): void
            {
                $this->write('missing', 'value');
            }
        };

        $this->expectException(UnauthorizedKeyAccessException::class);
        $stage->run();
    }

    public function testCannotReadWriteOnlyKey(): void
    {
        $stage = new class(new WorkflowState()) extends AbstractStage {
            public function register(): StageContract
            {
                return new StageContract()->addKey('out', KeyAccess::Write);
            }

            public function run(): void
            {
                $this->read('out');
            }
        };

        $this->expectException(UnauthorizedKeyAccessException::class);
        $stage->run();
    }

    public function testCannotWriteReadOnlyKey(): void
    {
        $stage = new class(new WorkflowState()) extends AbstractStage {
            public function register(): StageContract
            {
                return new StageContract()->addKey('in', KeyAccess::Read);
            }

            public function run(): void
            {
                $this->write('in', 'value');
            }
        };

        $this->expectException(UnauthorizedKeyAccessException::class);
        $stage->run();
    }
}
