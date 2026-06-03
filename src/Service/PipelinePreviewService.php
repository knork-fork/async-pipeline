<?php

declare(strict_types=1);

namespace App\Service;

use RuntimeException;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Yaml\Yaml;

final class PipelinePreviewService
{
    public function __construct(
        #[Autowire('%kernel.project_dir%')]
        private readonly string $projectDir,
    ) {
    }

    public function getPreviewHtml(string $pipelineId): string
    {
        $html = file_get_contents($this->projectDir . '/graph-editor/client/dist/preview.html');

        if ($html === false) {
            throw new RuntimeException('Preview bundle not found. Run: docker compose exec graph-editor-client npm run build');
        }

        $config = \sprintf(
            '<script>window.__PREVIEW_CONFIG=%s;</script>',
            (string) json_encode(['id' => $pipelineId, 'dataUrl' => '/pipeline/' . $pipelineId . '/preview/data']),
        );

        return str_replace('</head>', $config . '</head>', $html);
    }

    /**
     * @return array<string, mixed>
     */
    public function getPreviewData(string $pipelineId): array
    {
        /** @var array<string, mixed> $config */
        $config = Yaml::parseFile($this->projectDir . '/config/pipelines/test_pipeline.yaml');
        $config['currentRunningNodeId'] = 'start';

        return $config;
    }
}
