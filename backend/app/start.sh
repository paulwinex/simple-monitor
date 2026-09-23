#!/bin/bash

set -e
source /venv/bin/activate

# Apply database migrations before starting the app
alembic upgrade head
exec uvicorn --host 0.0.0.0 --port 8000 ${DEBUG:+--reload} app.main:app
