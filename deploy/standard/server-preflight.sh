#!/usr/bin/env bash
set -euo pipefail

echo "== 基础信息 =="
whoami || true
hostname || true
echo
cat /etc/os-release || true

echo
echo "== 时间 =="
date || true

echo
echo "== 磁盘 =="
df -h || true

echo
echo "== 内存 =="
free -h || true

echo
echo "== CPU =="
nproc || true

echo
echo "== Docker =="
docker --version || echo "Docker 未安装"
docker compose version || echo "Docker Compose 未安装"

echo
echo "== 端口占用（22/80/443/8080） =="
ss -ltnp | grep -E ':22 |:80 |:443 |:8080 ' || true

echo
echo "== 现有容器 =="
docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" || true

echo
echo "== Web 服务器进程 =="
ps -ef | grep -E 'nginx|caddy|apache2|httpd' | grep -v grep || true

echo
echo "== 常见站点目录 =="
ls -la /srv || true
ls -la /var/www || true

echo
echo "== 防火墙 =="
ufw status || true

echo
echo "== 建议结论 =="
echo "1. 如果 80/443 已被占用，先决定是否替换现有服务。"
echo "2. 如果已有线上容器，优先使用子域名或临时端口。"
echo "3. 如果 Docker 未安装，先完成基础环境安装。"
