CREATE TYPE pipeline_status AS ENUM ('pending', 'running', 'completed', 'failed', 'canceled');

CREATE TABLE pipelines (
    id SERIAL PRIMARY KEY,
    created TIMESTAMP NOT NULL DEFAULT NOW(),
    modified TIMESTAMP NOT NULL DEFAULT NOW(),
    status pipeline_status NOT NULL DEFAULT 'pending',
    type TEXT NOT NULL
);

