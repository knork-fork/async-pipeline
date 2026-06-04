#!/usr/bin/env bash

set -euo pipefail

curl -s -X POST http://localhost:20044/pipeline/create \
    -H 'Content-Type: application/json' \
    -d '{"name":"test","type":"test_pipeline"}'

echo
