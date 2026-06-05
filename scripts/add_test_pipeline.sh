#!/usr/bin/env bash

set -euo pipefail

curl -s -X POST http://localhost:20044/pipeline/create \
    -H 'Content-Type: application/json' \
    -d '{"type":"test_pipeline","data":{"key_1":"value1","key_2":"value2","key_3":"value3"}}'

echo
