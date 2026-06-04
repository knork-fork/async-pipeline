<?php

declare(strict_types=1);

namespace App\Controller;

use App\Dto\PipelineCreateRequest;
use App\Dto\PipelineStatusResponse;
use App\Exception\InvalidPipelineTypeException;
use App\Service\PipelineCreateService;
use App\Service\PipelinePreviewService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Serializer\SerializerInterface;

final class PipelineController extends AbstractController
{
    public function __construct(
        SerializerInterface $serializer,
        private readonly PipelineCreateService $pipelineCreateService,
        private readonly PipelinePreviewService $previewService,
    ) {
        parent::__construct($serializer);
    }

    #[Route('/pipeline/create', methods: ['POST'])]
    public function create(#[MapRequestPayload] PipelineCreateRequest $request): JsonResponse
    {
        try {
            return $this->toJsonResponse($this->pipelineCreateService->createPipeline($request));
        } catch (InvalidPipelineTypeException) {
            return new JsonResponse(['error' => 'Invalid pipeline type'], 400);
        }
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

    #[Route('/pipeline/{id}/preview', methods: ['GET'])]
    public function preview(string $id): Response
    {
        return new Response($this->previewService->getPreviewHtml($id), 200, ['Content-Type' => 'text/html; charset=UTF-8']);
    }

    #[Route('/pipeline/{id}/preview/data', methods: ['GET'])]
    public function previewData(string $id): JsonResponse
    {
        return new JsonResponse($this->previewService->getPreviewData($id));
    }
}
