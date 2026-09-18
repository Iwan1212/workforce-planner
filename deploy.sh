#!/bin/bash
# Manual deploy to a server running docker-compose.prod.yml.
# Target is taken from the environment so no infrastructure details live in the repo:
#   DEPLOY_HOST=planner.example.com DEPLOY_USER=deploy ./deploy.sh
set -e

: "${DEPLOY_HOST:?Set DEPLOY_HOST to the target server hostname}"
: "${DEPLOY_USER:?Set DEPLOY_USER to the SSH user on the target server}"
DEPLOY_PATH="${DEPLOY_PATH:-~/workforce-planner}"

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
  --exclude 'backups' \
  -e ssh \
  ./ ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/

echo "==> Building and starting containers..."
ssh ${DEPLOY_USER}@${DEPLOY_HOST} << REMOTE
  cd ${DEPLOY_PATH}
  docker compose -f docker-compose.prod.yml build
  docker compose -f docker-compose.prod.yml up -d
  docker image prune -f
REMOTE

echo "==> Done!"
