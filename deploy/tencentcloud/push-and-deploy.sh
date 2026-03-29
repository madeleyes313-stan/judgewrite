#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

DEPLOY_HOST="${DEPLOY_HOST:-49.232.72.156}"
DEPLOY_USER="${DEPLOY_USER:-ubuntu}"
DEPLOY_PATH="${DEPLOY_PATH:-/srv/judgewrite}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-$(git -C "${REPO_ROOT}" rev-parse --abbrev-ref HEAD)}"
DEPLOY_SERVICE="${DEPLOY_SERVICE:-all}"
DEPLOY_DOMAIN="${DEPLOY_DOMAIN:-https://pawtrip.pet/judgewrite/}"
DEPLOY_PUBLIC_HEALTHCHECK_URL="${DEPLOY_PUBLIC_HEALTHCHECK_URL:-https://pawtrip.pet/judgewrite/api/health}"
PUBLIC_CHECK_RETRIES="${PUBLIC_CHECK_RETRIES:-10}"
PUBLIC_CHECK_INTERVAL="${PUBLIC_CHECK_INTERVAL:-3}"

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
require_command git
require_command ssh

echo "==> 切换到项目目录: ${REPO_ROOT}"
cd "${REPO_ROOT}"

if [ ! -d .git ]; then
  echo "当前目录不是 Git 仓库。"
  exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "${CURRENT_BRANCH}" != "${DEPLOY_BRANCH}" ]; then
  echo "当前分支是 ${CURRENT_BRANCH}，但 DEPLOY_BRANCH=${DEPLOY_BRANCH}。"
  echo "请切换到目标分支，或显式指定 DEPLOY_BRANCH。"
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "检测到未提交改动，请先 commit 后再执行一键发布。"
  git status --short
  exit 1
fi

echo "==> 推送代码到 origin/${DEPLOY_BRANCH}"
git push origin "${DEPLOY_BRANCH}"

echo "==> 远端执行发布"
run_remote "cd '${DEPLOY_PATH}' && DEPLOY_BRANCH='${DEPLOY_BRANCH}' DEPLOY_SERVICE='${DEPLOY_SERVICE}' bash deploy/tencentcloud/update-from-git.sh"

echo "==> 验证公网页面入口"
run_remote "for attempt in \$(seq 1 '${PUBLIC_CHECK_RETRIES}'); do if curl -fsS '${DEPLOY_DOMAIN}' >/dev/null && curl -fsS '${DEPLOY_PUBLIC_HEALTHCHECK_URL}' >/dev/null; then echo '公网访问检查通过。'; break; fi; if [ \"\${attempt}\" -eq '${PUBLIC_CHECK_RETRIES}' ]; then echo '公网访问检查失败。'; exit 1; fi; echo '公网访问未通过，${PUBLIC_CHECK_INTERVAL} 秒后重试 ('\"\${attempt}\"'/'${PUBLIC_CHECK_RETRIES}')...'; sleep '${PUBLIC_CHECK_INTERVAL}'; done"

echo "==> 生成发布摘要"
REMOTE_COMMIT="$(run_remote "cd '${DEPLOY_PATH}' && git rev-parse --short HEAD")"
REMOTE_DEPLOY_TIME="$(run_remote "date '+%Y-%m-%d %H:%M:%S %Z'")"
HEALTH_SUMMARY="服务器内健康检查通过；公网入口与健康接口检查通过"

echo
echo "==> 一键发布完成"
echo "访问地址: ${DEPLOY_DOMAIN}"
echo
echo "发布摘要"
echo "- 当前线上提交号: ${REMOTE_COMMIT}"
echo "- 发布时间: ${REMOTE_DEPLOY_TIME}"
echo "- 健康检查结果: ${HEALTH_SUMMARY}"
