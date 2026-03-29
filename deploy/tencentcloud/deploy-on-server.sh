#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR=${1:-/srv/judgewrite}

echo "切换到项目目录: ${PROJECT_DIR}"
cd "${PROJECT_DIR}"

if [ ! -f deploy/tencentcloud/.env ]; then
  echo "未找到 deploy/tencentcloud/.env，请先从 .env.example 复制并填写。"
  exit 1
fi

echo "开始构建并启动 JudgeWrite..."
cd deploy/tencentcloud
docker compose up -d --build

echo "当前容器状态："
docker compose ps

echo
echo "健康检查："
curl -fsS http://127.0.0.1:8081/api/health || true
