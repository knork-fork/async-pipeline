<?php

declare(strict_types=1);

namespace App\Tests\Unit\Stage;

use App\Enum\KeyAccess;
use App\Stage\StageContract;
use App\Tests\Common\UnitTestCase;

/**
 * @internal
 */
final class StageContractTest extends UnitTestCase
{
    public function testGetReadKeysReturnsEmptyArrayByDefault(): void
    {
        $contract = new StageContract();

        self::assertSame([], $contract->getReadKeys());
    }

    public function testGetWriteKeysReturnsEmptyArrayByDefault(): void
    {
        $contract = new StageContract();

        self::assertSame([], $contract->getWriteKeys());
    }

    public function testAddReadKeyAppendsToReadKeys(): void
    {
        $contract = new StageContract();
        $contract->addKey('foo', KeyAccess::Read);

        self::assertSame(['foo'], $contract->getReadKeys());
        self::assertSame([], $contract->getWriteKeys());
    }

    public function testAddWriteKeyAppendsToWriteKeys(): void
    {
        $contract = new StageContract();
        $contract->addKey('bar', KeyAccess::Write);

        self::assertSame([], $contract->getReadKeys());
        self::assertSame(['bar'], $contract->getWriteKeys());
    }

    public function testAddKeyIsChainable(): void
    {
        $contract = new StageContract();
        $contract->addKey('foo', KeyAccess::Read)->addKey('bar', KeyAccess::Write);

        self::assertSame(['foo'], $contract->getReadKeys());
        self::assertSame(['bar'], $contract->getWriteKeys());
    }

    public function testKeysAreOrderPreserved(): void
    {
        $contract = new StageContract();
        $contract->addKey('c', KeyAccess::Read)->addKey('a', KeyAccess::Read)->addKey('b', KeyAccess::Read);
        $contract->addKey('z', KeyAccess::Write)->addKey('y', KeyAccess::Write);

        self::assertSame(['c', 'a', 'b'], $contract->getReadKeys());
        self::assertSame(['z', 'y'], $contract->getWriteKeys());
    }
}
