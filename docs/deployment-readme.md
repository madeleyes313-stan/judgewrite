# 部署文档索引

## 当前项目专用
- `docs/tencentcloud-deploy.md`
  - JudgeWrite 当前项目的腾讯云单机部署方案
- `docs/tencentcloud-git-deploy.md`
  - JudgeWrite 切换为 Git 仓库与服务器 `git pull` 发布说明

## 可复用标准流程
- `docs/deployment-standard-playbook.md`
  - 以后任何新产品部署都可以复用的标准 SOP
- `docs/deployment-intake-template.md`
  - 新项目部署前的信息采集模板

## 可复用脚本
- `deploy/standard/server-preflight.sh`
  - 服务器预检脚本
- `deploy/tencentcloud/server-setup-ubuntu.sh`
  - Ubuntu 服务器安装 Docker
- `deploy/tencentcloud/deploy-on-server.sh`
  - 当前项目的一键部署脚本
- `deploy/tencentcloud/update-from-git.sh`
  - 服务器通过 Git 拉取最新代码并发布
