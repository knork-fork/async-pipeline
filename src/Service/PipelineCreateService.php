<?php

declare(strict_types=1);

namespace App\Service;

use App\Dto\PipelineCreateRequest;
use App\Dto\PipelineCreateResponse;
use App\Entity\Pipeline;
use App\Exception\InvalidPipelineTypeException;
use Doctrine\ORM\EntityManagerInterface;

final class PipelineCreateService
{
    /** @param list<string> $availablePipelineFiles */
    public function __construct(
        private readonly array $availablePipelineFiles,
        private readonly EntityManagerInterface $em,
    ) {
    }

    /**
     * Factory method for creating an instance of PipelineCreateService with available pipeline types loaded from the config directory
     */
    public static function create(string $projectDir, EntityManagerInterface $em): self
    {
        $files = array_map('basename', glob($projectDir . '/config/pipelines/*.yaml') ?: []);

        return new self($files, $em);
    }

    public function createPipeline(PipelineCreateRequest $request): PipelineCreateResponse
    {
        $type = $request->type;
        if (str_ends_with($type, '.yaml')) {
            $type = substr($type, 0, -5);
        }

        $availableTypes = array_map(static fn (string $f) => pathinfo($f, \PATHINFO_FILENAME), $this->availablePipelineFiles);

        if (!\in_array($type, $availableTypes, true)) {
            throw new InvalidPipelineTypeException(\sprintf('Unknown pipeline type "%s".', $type));
        }

        $pipeline = new Pipeline($type);
        $this->em->persist($pipeline);
        $this->em->flush();

        return new PipelineCreateResponse(id: (int) $pipeline->getId());
    }
}
