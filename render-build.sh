#!/usr/bin/env bash
set -o errexit

# Install backend dependencies
pip install -r backend/requirements.txt

# Build frontend
cd frontend
npm install
npm run build
cd ..

# Run database migrations and create admin user
cd backend
alembic upgrade head
python scripts/create_admin.py
