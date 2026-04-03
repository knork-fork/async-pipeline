<?php

declare(strict_types=1);

namespace App\Tests\Common;

use PHPUnit\Framework\TestCase;
use RuntimeException;

abstract class FunctionalTestCase extends TestCase
{
    private string $responseBody = '';
    private int $responseStatusCode = 0;

    /**
     * @param non-empty-string     $method
     * @param array<string, mixed> $params
     */
    protected function request(string $method, string $uri, array $params = []): void
    {
        $baseUrl = $_ENV['BASE_LOCAL_URL'] ?? throw new RuntimeException('BASE_LOCAL_URL env variable is not set');

        if (!\is_string($baseUrl) || $baseUrl === '') {
            throw new RuntimeException('BASE_LOCAL_URL env variable must be a non-empty string');
        }

        if ($method === 'GET' && $params !== []) {
            $uri .= (!str_contains($uri, '?') ? '?' : '&') . http_build_query($params);
            $params = [];
        }

        $ch = curl_init();
        if ($ch === false) {
            throw new RuntimeException('Failed to initialize cURL');
        }

        curl_setopt_array($ch, [
            \CURLOPT_RETURNTRANSFER => true,
            \CURLOPT_URL => $baseUrl . $uri,
            \CURLOPT_CUSTOMREQUEST => $method,
            \CURLOPT_POSTFIELDS => json_encode($params, \JSON_THROW_ON_ERROR),
            \CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Accept: application/json',
            ],
        ]);

        $result = curl_exec($ch);

        if ($result === false) {
            throw new RuntimeException(curl_error($ch));
        }

        $this->responseStatusCode = curl_getinfo($ch, \CURLINFO_HTTP_CODE);
        $this->responseBody = (string) $result;
    }

    /** @param array<string, mixed> $expected */
    protected function assertJsonResponse(array $expected, int $expectedResponseCode = 200): void
    {
        self::assertSame($expectedResponseCode, $this->responseStatusCode);
        self::assertJson($this->responseBody);

        $response = json_decode($this->responseBody, true);
        self::assertSame($expected, $response);
    }
}
