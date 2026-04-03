<?php

declare(strict_types=1);

namespace App\Controller;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Serializer\SerializerInterface;

abstract class AbstractController
{
    public function __construct(
        private readonly SerializerInterface $serializer,
    ) {
    }

    protected function toJsonResponse(object $data, int $status = 200): JsonResponse
    {
        return JsonResponse::fromJsonString(
            $this->serializer->serialize($data, 'json'),
            $status,
        );
    }
}
