#!/usr/bin/env bash

current_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

if [[ -f "${current_path}/db_initialized" ]]; then
    if [[ "$1" != "--reinit" ]]; then
        echo "Database already initialized, use --reinit to reinitialize."
        exit 0
    fi
    echo "Reinitializing database..."
    rm -f "${current_path}/db_initialized"
else
    echo "Initializing database..."
fi

db_name="async_pipeline_db"
echo "Running init-db.sh for ${db_name}..."

docker exec -e PGPASSWORD=async_pipeline_pass -i async-pipeline-db \
    psql -U async_pipeline_user -h async-pipeline-postgres -d postgres -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${db_name}' AND pid <> pg_backend_pid();"

docker exec -e PGPASSWORD=async_pipeline_pass -i async-pipeline-db \
    psql -U async_pipeline_user -h async-pipeline-postgres -d postgres -c \
    "DROP DATABASE IF EXISTS ${db_name};"
[[ $? -ne 0 ]] && { echo "Cannot drop database ${db_name}. Aborting..."; exit 2; }

docker exec -e PGPASSWORD=async_pipeline_pass -i async-pipeline-db \
    psql -U async_pipeline_user -h async-pipeline-postgres -d postgres -c \
    "CREATE DATABASE ${db_name};"
[[ $? -ne 0 ]] && { echo "Failed creating database ${db_name}."; exit 2; }

docker exec -e PGPASSWORD=async_pipeline_pass -i async-pipeline-db \
    psql -U async_pipeline_user -h async-pipeline-postgres -d ${db_name} \
    < ${current_path}/db_skeleton.sql
[[ $? -ne 0 ]] && { echo "Failed importing skeleton to ${db_name}."; exit 2; }

echo "Database initialized."
touch "${current_path}/db_initialized"
exit 0
