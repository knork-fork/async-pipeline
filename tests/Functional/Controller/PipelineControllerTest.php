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
            'name' => 'test-pipeline',
            'data' => ['key' => 'value'],
        ]);

        $this->assertJsonResponse(['id' => 1]);
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
