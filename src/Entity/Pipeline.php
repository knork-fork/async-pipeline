<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\PipelineStatus;
use DateTimeImmutable;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: \App\Repository\PipelineRepository::class)]
#[ORM\Table(name: 'pipelines')]
class Pipeline
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null; // @phpstan-ignore property.unusedType

    #[ORM\Column]
    private DateTimeImmutable $created;

    #[ORM\Column(type: 'datetime_immutable')]
    private DateTimeImmutable $modified;

    #[ORM\Column(type: 'string', enumType: PipelineStatus::class, options: ['default' => 'pending'])]
    private PipelineStatus $status = PipelineStatus::Pending;

    #[ORM\Column(type: 'text')]
    private string $type;

    public function __construct(string $type)
    {
        $this->type = $type;
        $this->created = new DateTimeImmutable();
        $this->modified = new DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getType(): string
    {
        return $this->type;
    }

    public function getStatus(): PipelineStatus
    {
        return $this->status;
    }

    public function getCreated(): DateTimeImmutable
    {
        return $this->created;
    }

    public function getModified(): DateTimeImmutable
    {
        return $this->modified;
    }
}
