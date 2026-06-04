#!/usr/bin/env bash

current_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

is_test=false
reinit=false

for arg in "$@"; do
    case "$arg" in
        --test) is_test=true ;;
        --reinit) reinit=true ;;
    esac
done

if [[ "$is_test" == true ]]; then
    db_name="async_pipeline_db_test"
    echo "Initializing test database..."
else
    db_name="async_pipeline_db"

    if [[ -f "${current_path}/db_initialized" ]]; then
        if [[ "$reinit" == false ]]; then
            echo "Database already initialized, use --reinit to reinitialize."
            exit 0
        fi
        echo "Reinitializing database..."
        rm -f "${current_path}/db_initialized"
    else
        echo "Initializing database..."
    fi
fi

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

if [[ "$is_test" == true ]]; then
    docker exec -e PGPASSWORD=async_pipeline_pass -i async-pipeline-db \
        psql -U async_pipeline_user -h async-pipeline-postgres -d ${db_name} \
        < ${current_path}/db_test_fixtures.sql
    [[ $? -ne 0 ]] && { echo "Failed importing fixtures to ${db_name}."; exit 2; }
    echo "Test database initialized."
else
    echo "Database initialized."
    touch "${current_path}/db_initialized"
fi

exit 0
