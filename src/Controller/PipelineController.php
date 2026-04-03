<?php

declare(strict_types=1);

namespace App\Controller;

use App\Dto\PipelineCreateRequest;
use App\Dto\PipelineCreateResponse;
use App\Dto\PipelineStatusResponse;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;

final class PipelineController extends AbstractController
{
    #[Route('/pipeline/create', methods: ['POST'])]
    public function create(#[MapRequestPayload] PipelineCreateRequest $request): JsonResponse
    {
        return $this->toJsonResponse(
            new PipelineCreateResponse(id: 1),
        );
    }

    #[Route('/pipeline/{id}/status', methods: ['GET'])]
    public function status(string $id): JsonResponse
    {
        return $this->toJsonResponse(
            new PipelineStatusResponse(
                status: 'pending',
                lastCompletedStage: null,
            ),
        );
    }
}
