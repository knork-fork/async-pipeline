<?php

declare(strict_types=1);

namespace App\Tests\Functional\Controller;

use App\Tests\Common\FunctionalTestCase;

/**
 * @internal
 */
final class PipelineControllerTest extends FunctionalTestCase
{
    public function testCreatePipeline(): void
    {
        $this->request('POST', '/pipeline/create', [
            'type' => 'test_pipeline',
            'data' => ['key' => 'value'],
        ]);

        $response = $this->decodeJsonResponse();
        self::assertArrayHasKey('id', $response);
        self::assertIsInt($response['id']);
    }

    public function testCreatePipelineWithInvalidType(): void
    {
        $this->request('POST', '/pipeline/create', [
            'type' => 'nonexistent_pipeline',
        ]);

        $this->assertJsonResponse(['error' => 'Invalid pipeline type'], 400);
    }

    public function testGetPipelineStatus(): void
    {
        $this->request('GET', '/pipeline/1/status');

        $this->assertJsonResponse([
            'status' => 'pending',
            'lastCompletedStage' => null,
        ]);
    }
}
