<?php

declare(strict_types=1);

namespace App\Service;

use App\Dto\PipelineCreateRequest;
use App\Dto\PipelineCreateResponse;
use App\Entity\Pipeline;
use App\Exception\InvalidPipelineDataException;
use App\Exception\InvalidPipelineTypeException;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Yaml\Yaml;

final class PipelineCreateService
{
    /** @param array<string, string> $pipelineFiles map of type name to full file path */
    public function __construct(
        private readonly array $pipelineFiles,
        private readonly EntityManagerInterface $em,
        private readonly PipelineValidatorInterface $validator,
        private readonly string $stageNamespace,
    ) {
    }

    /**
     * Factory method for creating an instance of PipelineCreateService with available pipeline types loaded from the config directory
     */
    public static function create(string $projectDir, EntityManagerInterface $em): self
    {
        $files = glob($projectDir . '/config/pipelines/*.yaml') ?: [];
        $pipelineFiles = [];
        foreach ($files as $file) {
            $pipelineFiles[pathinfo($file, \PATHINFO_FILENAME)] = $file;
        }

        return new self($pipelineFiles, $em, new PipelineValidator(), 'App\Stage');
    }

    public function createPipeline(PipelineCreateRequest $request): PipelineCreateResponse
    {
        $type = $request->type;
        if (str_ends_with($type, '.yaml')) {
            $type = substr($type, 0, -5);
        }

        if (!isset($this->pipelineFiles[$type])) {
            throw new InvalidPipelineTypeException(\sprintf('Unknown pipeline type "%s".', $type));
        }

        /** @var array<string, mixed> $pipelineDefinition */
        $pipelineDefinition = Yaml::parseFile($this->pipelineFiles[$type]);

        // Pipeline job can't be created if
        // - pipeline definition is invalid
        // - request data doesn't match pipeline contract
        $result = $this->validator->validate($pipelineDefinition, $this->stageNamespace, $request->data);
        if (!$result->isValid()) {
            throw new InvalidPipelineDataException(implode(' ', $result->getErrors()));
        }

        $pipeline = new Pipeline($type);
        $this->em->persist($pipeline);
        $this->em->flush();

        return new PipelineCreateResponse(id: (int) $pipeline->getId());
    }
}
