#!/usr/bin/env bash
set -o errexit

# Install backend dependencies
pip install -r backend/requirements.txt

# Build frontend
cd frontend
npm install
npm run build
cd ..
