#!/bin/bash
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Creating admin user (if not exists)..."
python scripts/create_admin.py

echo "Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
