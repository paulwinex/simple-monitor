#!/bin/bash

set -e
source /venv/bin/activate
pytest -v --tb=short
