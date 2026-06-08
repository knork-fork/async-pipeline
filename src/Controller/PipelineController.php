<?php

declare(strict_types=1);

namespace App\Controller;

use App\Dto\PipelineCreateRequest;
use App\Dto\PipelineStatusResponse;
use App\Exception\InvalidPipelineDataException;
use App\Exception\InvalidPipelineTypeException;
use App\Repository\PipelineRepository;
use App\Service\PipelineCreateService;
use App\Service\PipelinePreviewService;
use App\Service\PipelineValidatorInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
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
        private readonly PipelineRepository $pipelineRepository,
        private readonly PipelineValidatorInterface $validator,
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
        } catch (InvalidPipelineDataException) {
            return new JsonResponse(['error' => 'Invalid pipeline data'], 400);
        }
    }

    #[Route('/pipeline/validate-structure', methods: ['POST'])]
    public function validateStructure(Request $request): JsonResponse
    {
        /** @var array<string, mixed>|null $body */
        $body = json_decode($request->getContent(), true);
        $pipeline = \is_array($body['pipeline'] ?? null) ? $body['pipeline'] : [];

        $result = $this->validator->validate($pipeline, 'App\Stage');

        return new JsonResponse([
            'valid' => $result->isValid(),
            'errors' => $result->getErrors(),
        ]);
    }

    #[Route('/pipeline/{id}/status', methods: ['GET'])]
    public function status(string $id): JsonResponse
    {
        $pipeline = $this->pipelineRepository->find((int) $id);

        if ($pipeline === null) {
            return new JsonResponse(['error' => 'Pipeline not found'], 404);
        }

        return $this->toJsonResponse(
            new PipelineStatusResponse(
                status: $pipeline->getStatus(),
                lastCompletedStage: null,
            ),
        );
    }

    #[Route('/pipeline/{id}/preview', methods: ['GET'])]
    public function preview(string $id): Response
    {
        $pipeline = $this->pipelineRepository->find((int) $id);

        if ($pipeline === null) {
            return new JsonResponse(['error' => 'Pipeline not found'], 404);
        }

        return new Response($this->previewService->getPreviewHtml($id), 200, ['Content-Type' => 'text/html; charset=UTF-8']);
    }

    #[Route('/pipeline/{id}/preview/data', methods: ['GET'])]
    public function previewData(string $id): JsonResponse
    {
        $pipeline = $this->pipelineRepository->find((int) $id);

        if ($pipeline === null) {
            return new JsonResponse(['error' => 'Pipeline not found'], 404);
        }

        return new JsonResponse($this->previewService->getPreviewData($id));
    }
}
