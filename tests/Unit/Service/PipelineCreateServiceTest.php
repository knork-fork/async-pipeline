<?php

declare(strict_types=1);

namespace App\Tests\Unit\Service;

use App\Dto\PipelineCreateRequest;
use App\Entity\Pipeline;
use App\Exception\InvalidPipelineDataException;
use App\Exception\InvalidPipelineTypeException;
use App\Pipeline\ValidationResult;
use App\Service\PipelineCreateService;
use App\Service\PipelineValidatorInterface;
use App\Tests\Common\UnitTestCase;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\Attributes\DataProvider;

/**
 * @internal
 */
final class PipelineCreateServiceTest extends UnitTestCase
{
    private const string FIXTURE_YAML = __DIR__ . '/../../Files/pipelines/base.yaml';

    /** @return array<string, string> */
    private static function pipelineFiles(): array
    {
        return [
            'test_pipeline' => self::FIXTURE_YAML,
            'simple_pipeline' => self::FIXTURE_YAML,
        ];
    }

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

        $validator = self::createStub(PipelineValidatorInterface::class);
        $validator->method('validate')->willReturn(ValidationResult::pass());

        $service = new PipelineCreateService(self::pipelineFiles(), $em, $validator, '');
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

        $validator = self::createStub(PipelineValidatorInterface::class);

        $service = new PipelineCreateService(self::pipelineFiles(), $em, $validator, '');
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

    public function testCreatePipelineThrowsWhenValidationFails(): void
    {
        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects(self::never())->method('persist');
        $em->expects(self::never())->method('flush');

        $validator = $this->createMock(PipelineValidatorInterface::class);
        $validator->expects(self::once())
            ->method('validate')
            ->willReturn(ValidationResult::fail('Input data keys [] do not match pipeline contract [key_1, key_2, key_3].'))
        ;

        $service = new PipelineCreateService(self::pipelineFiles(), $em, $validator, 'App\Stage');
        $request = new PipelineCreateRequest(type: 'test_pipeline', data: []);

        $this->expectException(InvalidPipelineDataException::class);
        $service->createPipeline($request);
    }

    public function testCreatePipelineSucceedsWhenValidationPasses(): void
    {
        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects(self::once())->method('persist');
        $em->expects(self::once())->method('flush');

        $validator = $this->createMock(PipelineValidatorInterface::class);
        $validator->expects(self::once())
            ->method('validate')
            ->willReturn(ValidationResult::pass())
        ;

        $service = new PipelineCreateService(self::pipelineFiles(), $em, $validator, 'App\Stage');
        $request = new PipelineCreateRequest(type: 'test_pipeline', data: ['key_1' => 'a', 'key_2' => 'b', 'key_3' => 'c']);

        $service->createPipeline($request);
    }
}
