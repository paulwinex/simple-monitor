set dotenv-load

# List of commands
default:
    @just --list


# Backend commands
[working-directory: 'backend']
install:
    uv sync --all-packages


# build docker image
[working-directory: 'deploy']
build args="":
    docker compose build {{args}}

# start backend locally
[working-directory: 'backend']
backend-local:
    uv run uvicorn --host 0.0.0.0 --port 8000 app.main:app


# start backend and frontend
[working-directory: 'deploy']
up *ARGS:
    docker compose up {{ ARGS }}


[working-directory: 'deploy']
down:
    docker compose down

# show backend logs
[working-directory: 'deploy']
backend-logs:
    docker compose logs -f --tail 100


[working-directory: 'frontend']
front-up:
    yarn dev


# Create migrations
[working-directory: 'backend']
[script]
makemigrations MESSAGE="no message":
    uv run alembic revision --autogenerate -m "{{MESSAGE}}"


# Apply migrations
[group('db')]
[working-directory: 'backend']
[script]
applymigrations:
    uv run alembic upgrade head


# Test commands
# Build test image
[working-directory: 'deploy']
test-build:
    docker compose -f docker-compose.testing.yml build --progress=plain

# Run tests in Docker
[working-directory: 'deploy']
test:
    docker compose -f docker-compose.testing.yml up --abort-on-container-exit

# Build and run tests
[working-directory: 'deploy']
test-run:
    docker compose -f docker-compose.testing.yml build --progress=plain
    docker compose -f docker-compose.testing.yml up --abort-on-container-exit

# Stop test containers
[working-directory: 'deploy']
test-down:
    docker compose -f docker-compose.testing.yml down

# Clean test containers
[working-directory: 'deploy']
test-clean:
    docker compose -f docker-compose.testing.yml down -v --remove-orphans

# Copy images to remote host (ssh keys required)
push-to-host host:
    docker save sm-api:latest | gzip | ssh {{host}} "gunzip | docker load"
    docker save sm-ui:latest | gzip | ssh {{host}} "gunzip | docker load"

