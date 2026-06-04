<?php

declare(strict_types=1);

namespace App\Tests\Common;

use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

abstract class FunctionalTestCase extends WebTestCase
{
    private Response $response; // @phpstan-ignore property.uninitialized
    private KernelBrowser $client; // @phpstan-ignore property.uninitialized

    protected function setUp(): void
    {
        parent::setUp();
        $this->client = static::createClient();
    }

    /**
     * @param non-empty-string     $method
     * @param array<string, mixed> $params
     */
    protected function request(string $method, string $uri, array $params = []): void
    {
        $client = $this->client;

        $content = null;
        $queryString = '';

        if ($method === 'GET' && $params !== []) {
            $queryString = '?' . http_build_query($params);
        } elseif ($params !== []) {
            $content = json_encode($params, \JSON_THROW_ON_ERROR);
        }

        $client->request($method, $uri . $queryString, [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
        ], $content);

        $this->response = $client->getResponse();
    }

    /** @param array<string, mixed> $expected */
    protected function assertJsonResponse(array $expected, int $expectedResponseCode = 200): void
    {
        self::assertSame($expectedResponseCode, $this->response->getStatusCode());
        self::assertJson((string) $this->response->getContent());

        $response = json_decode((string) $this->response->getContent(), true);
        self::assertSame($expected, $response);
    }

    /** @return array<string, mixed> */
    protected function decodeJsonResponse(int $expectedResponseCode = 200): array
    {
        self::assertSame($expectedResponseCode, $this->response->getStatusCode());
        self::assertJson((string) $this->response->getContent());

        $decoded = json_decode((string) $this->response->getContent(), true);
        self::assertIsArray($decoded);

        return $decoded;
    }
}
