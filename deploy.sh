#!/bin/bash
set -e

DEPLOY_HOST="employee-engagement.staging.mntm.dev"
DEPLOY_USER="employee-engagement"
DEPLOY_PATH="~/workforce-planner"

echo "==> Syncing files..."
rsync -avz --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '__pycache__' \
  --exclude '.env' \
  --exclude '.venv' \
  --exclude 'venv' \
  --exclude '.pytest_cache' \
  --exclude '.claude' \
  -e ssh \
  ./ ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/

echo "==> Building and starting containers..."
ssh ${DEPLOY_USER}@${DEPLOY_HOST} << 'EOF'
  cd ~/workforce-planner
  docker compose -f docker-compose.prod.yml build
  docker compose -f docker-compose.prod.yml up -d
  docker image prune -f
EOF

echo "==> Done!"
