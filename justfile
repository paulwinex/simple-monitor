set dotenv-load

# List of commands
default:
    @just --list


# Backend commands
install:
    uv sync --all-packages


# build docker image
[working-directory: 'backend']
build:
    docker compose build

# start backend locally
[working-directory: 'backend']
backend-local:
    uv run --package backend uvicorn --host 0.0.0.0 --port 8000 app.main:app


# start backend in docker
[working-directory: 'backend']
backend-up:
    docker compose up


# Stop docker backend container
[working-directory: 'backend']
backend-down:
    docker compose down


# show backend logs
backend-logs:
    docker compose logs -f --tail 100


# Start client locally
[working-directory: 'client']
client:
    uv run --package client python -m sm_client


# Test commands
# Build test image
[working-directory: 'backend']
test-build:
    docker compose -f docker-compose.testing.yml build --progress=plain

# Run tests in Docker
[working-directory: 'backend']
test:
    docker compose -f docker-compose.testing.yml up --abort-on-container-exit

# Build and run tests
[working-directory: 'backend']
test-run:
    docker compose -f docker-compose.testing.yml build --progress=plain
    docker compose -f docker-compose.testing.yml up --abort-on-container-exit

# Stop test containers
[working-directory: 'backend']
test-down:
    docker compose -f docker-compose.testing.yml down

# Clean test containers
[working-directory: 'backend']
test-clean:
    docker compose -f docker-compose.testing.yml down -v --remove-orphans


