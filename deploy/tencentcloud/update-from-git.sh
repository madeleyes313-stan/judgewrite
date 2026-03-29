#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${1:-/srv/judgewrite}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
DEPLOY_SERVICE="${DEPLOY_SERVICE:-all}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://127.0.0.1:8081/api/health}"
HEALTHCHECK_RETRIES="${HEALTHCHECK_RETRIES:-10}"
HEALTHCHECK_INTERVAL="${HEALTHCHECK_INTERVAL:-3}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "缺少命令: $1"
    exit 1
  fi
}

echo "==> 检查依赖"
require_command git
require_command docker
require_command curl

echo "==> 切换到项目目录: ${PROJECT_DIR}"
cd "${PROJECT_DIR}"

if [ ! -d .git ]; then
  echo "当前目录不是 Git 工作区，请先 clone 仓库到 ${PROJECT_DIR}"
  exit 1
fi

if [ ! -f deploy/tencentcloud/.env ]; then
  echo "未找到 deploy/tencentcloud/.env，请先在服务器上配置环境变量。"
  exit 1
fi

echo "==> 拉取最新代码: origin/${DEPLOY_BRANCH}"
git fetch --all --prune
git checkout "${DEPLOY_BRANCH}"
git pull --ff-only origin "${DEPLOY_BRANCH}"

echo "==> 重建并启动服务"
cd deploy/tencentcloud
case "${DEPLOY_SERVICE}" in
  all)
    docker compose up -d --build
    ;;
  web|api)
    docker compose up -d --build "${DEPLOY_SERVICE}"
    ;;
  *)
    echo "不支持的 DEPLOY_SERVICE: ${DEPLOY_SERVICE}"
    echo "可选值: all, web, api"
    exit 1
    ;;
esac

echo "==> 当前容器状态"
docker compose ps

echo "==> 健康检查"
for attempt in $(seq 1 "${HEALTHCHECK_RETRIES}"); do
  if curl -fsS "${HEALTHCHECK_URL}"; then
    echo
    echo "健康检查通过。"
    break
  fi

  if [ "${attempt}" -eq "${HEALTHCHECK_RETRIES}" ]; then
    echo
    echo "健康检查失败，已重试 ${HEALTHCHECK_RETRIES} 次。"
    exit 1
  fi

  echo
  echo "健康检查未通过，${HEALTHCHECK_INTERVAL} 秒后重试 (${attempt}/${HEALTHCHECK_RETRIES})..."
  sleep "${HEALTHCHECK_INTERVAL}"
done

echo
echo "发布完成。"
