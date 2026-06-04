<?php

declare(strict_types=1);

namespace App\Tests\Unit\Stage;

use App\Stage\StageContract;
use App\Tests\Common\UnitTestCase;

/**
 * @internal
 */
final class StageContractTest extends UnitTestCase
{
    public function testGetKeysReturnsEmptyArrayByDefault(): void
    {
        $contract = new StageContract();

        self::assertSame([], $contract->getKeys());
    }

    public function testAddKeyAppendsKey(): void
    {
        $contract = new StageContract();
        $contract->addKey('foo');

        self::assertSame(['foo'], $contract->getKeys());
    }

    public function testAddKeyIsChainable(): void
    {
        $contract = new StageContract();
        $contract->addKey('foo')->addKey('bar');

        self::assertSame(['foo', 'bar'], $contract->getKeys());
    }

    public function testKeysAreOrderPreserved(): void
    {
        $contract = new StageContract();
        $contract->addKey('c')->addKey('a')->addKey('b');

        self::assertSame(['c', 'a', 'b'], $contract->getKeys());
    }
}
