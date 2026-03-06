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


