<?php

declare(strict_types=1);

namespace App\Tests\Unit\Service;

use App\Dto\PipelineCreateRequest;
use App\Entity\Pipeline;
use App\Exception\InvalidPipelineTypeException;
use App\Service\PipelineCreateService;
use App\Tests\Common\UnitTestCase;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\Attributes\DataProvider;

/**
 * @internal
 */
final class PipelineCreateServiceTest extends UnitTestCase
{
    private const array AVAILABLE_FILES = ['test_pipeline.yaml', 'simple_pipeline.yaml'];

    #[DataProvider('provideCreatePipelineWithValidTypeCases')]
    public function testCreatePipelineWithValidType(string $inputType, string $expectedSavedType): void
    {
        $capturedEntity = null;

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects(self::once())
            ->method('persist')
            ->with(self::callback(static function (Pipeline $pipeline) use (&$capturedEntity): bool {
                $capturedEntity = $pipeline;

                return true;
            }))
        ;
        $em->expects(self::once())->method('flush');

        $service = new PipelineCreateService(self::AVAILABLE_FILES, $em);
        $request = new PipelineCreateRequest(type: $inputType);

        $service->createPipeline($request);

        self::assertInstanceOf(Pipeline::class, $capturedEntity);
        self::assertSame($expectedSavedType, $capturedEntity->getType());
    }

    /** @return array<string, array{string, string}> */
    public static function provideCreatePipelineWithValidTypeCases(): iterable
    {
        return [
            'type without yaml extension' => ['test_pipeline', 'test_pipeline'],
            'type with yaml extension' => ['test_pipeline.yaml', 'test_pipeline'],
            'other pipeline without extension' => ['simple_pipeline', 'simple_pipeline'],
            'other pipeline with extension' => ['simple_pipeline.yaml', 'simple_pipeline'],
        ];
    }

    #[DataProvider('provideCreatePipelineWithInvalidTypeThrowsCases')]
    public function testCreatePipelineWithInvalidTypeThrows(string $inputType): void
    {
        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects(self::never())->method('persist');
        $em->expects(self::never())->method('flush');

        $service = new PipelineCreateService(self::AVAILABLE_FILES, $em);
        $request = new PipelineCreateRequest(type: $inputType);

        $this->expectException(InvalidPipelineTypeException::class);
        $service->createPipeline($request);
    }

    /** @return array<string, array{string}> */
    public static function provideCreatePipelineWithInvalidTypeThrowsCases(): iterable
    {
        return [
            'unknown type' => ['unknown_pipeline'],
            'wrong extension' => ['test_pipeline.yml'],
            'empty string' => [''],
            'partial match' => ['test'],
        ];
    }
}
