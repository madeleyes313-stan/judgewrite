#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

DEPLOY_HOST="${DEPLOY_HOST:-49.232.72.156}"
DEPLOY_USER="${DEPLOY_USER:-ubuntu}"
DEPLOY_PATH="${DEPLOY_PATH:-/srv/judgewrite}"
DEPLOY_DOMAIN="${DEPLOY_DOMAIN:-https://pawtrip.pet/judgewrite/}"
DEPLOY_HEALTHCHECK_URL="${DEPLOY_HEALTHCHECK_URL:-https://pawtrip.pet/judgewrite/api/health}"
DEPLOY_SERVICE="${DEPLOY_SERVICE:-all}"
SKIP_BUILD="${SKIP_BUILD:-0}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "缺少命令: $1"
    exit 1
  fi
}

run_remote() {
  ssh -o StrictHostKeyChecking=no "${DEPLOY_USER}@${DEPLOY_HOST}" "$@"
}

echo "==> 检查本地依赖"
require_command ssh
require_command rsync
require_command npm

if [[ "${SKIP_BUILD}" != "1" ]]; then
  echo "==> 本地构建前端"
  (
    cd "${REPO_ROOT}"
    npm run web:build
  )
else
  echo "==> 跳过本地构建检查"
fi

echo "==> 检查远端目录"
run_remote "test -d '${DEPLOY_PATH}'"

echo "==> 同步代码到服务器"
rsync -avz --delete \
  --filter='P deploy/tencentcloud/.env' \
  --filter='P apps/api/.env' \
  --filter='P apps/web/.env.production' \
  --exclude '.git' \
  --exclude '.cursor' \
  --exclude '.DS_Store' \
  --exclude 'node_modules' \
  --exclude '.venv' \
  --exclude 'dist' \
  --exclude 'playwright-report' \
  --exclude 'test-results' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude '*.pyo' \
  --exclude '.pytest_cache' \
  --exclude '.mypy_cache' \
  --exclude '.ruff_cache' \
  "${REPO_ROOT}/" "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/"

echo "==> 在服务器上重建并重启服务"
case "${DEPLOY_SERVICE}" in
  all)
    REMOTE_UP_CMD="docker compose up -d --build"
    ;;
  web|api)
    REMOTE_UP_CMD="docker compose up -d --build ${DEPLOY_SERVICE}"
    ;;
  *)
    echo "不支持的 DEPLOY_SERVICE: ${DEPLOY_SERVICE}"
    echo "可选值: all, web, api"
    exit 1
    ;;
esac

run_remote "cd '${DEPLOY_PATH}/deploy/tencentcloud' && ${REMOTE_UP_CMD} && docker compose ps"

echo "==> 服务器内健康检查"
run_remote "curl -fsS 'http://127.0.0.1:8081/api/health'"

echo
echo "==> 发布完成"
echo "访问地址: ${DEPLOY_DOMAIN}"
echo "健康检查: ${DEPLOY_HEALTHCHECK_URL}"
