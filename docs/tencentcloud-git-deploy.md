# JudgeWrite Git 部署说明

本文档说明如何把当前 `JudgeWrite` 项目切换为 Git 仓库管理，并在服务器上通过 `git pull` 更新代码。

## 目标

- 本地开发通过 Git 管理代码版本
- 代码推送到远端私有仓库
- 腾讯云服务器从远端仓库拉取最新代码
- 服务器执行 `deploy/tencentcloud/update-from-git.sh` 完成重建发布

## 一次性初始化

### 1. 本地初始化 Git 仓库

如果当前目录还不是 Git 仓库，在项目根目录执行：

```bash
git init
git branch -M main
```

项目已经在 `.gitignore` 中排除了这些线上敏感配置：

- `deploy/tencentcloud/.env`
- `apps/api/.env`
- `apps/web/.env.production`

### 2. 创建远端私有仓库

建议使用：

- GitHub Private Repo
- Gitee 私有仓库
- 你自己的 Git 服务

创建完成后，记下仓库地址，例如：

```bash
git remote add origin git@github.com:your-org/judgewrite.git
```

### 3. 首次推送代码

```bash
git add .
git commit -m "Initialize JudgeWrite repository"
git push -u origin main
```

### 4. 服务器首次改为 Git clone

如果服务器上当前代码目录是手工同步过去的，建议备份后再切换：

```bash
mv /srv/judgewrite /srv/judgewrite.backup.$(date +%Y%m%d%H%M%S)
git clone <你的仓库地址> /srv/judgewrite
```

然后把原有线上环境文件补回去：

- `/srv/judgewrite/deploy/tencentcloud/.env`

如果你的线上还有自定义环境文件，也要一并恢复：

- `/srv/judgewrite/apps/api/.env`
- `/srv/judgewrite/apps/web/.env.production`

### 5. 服务器首次发布

```bash
cd /srv/judgewrite
bash deploy/tencentcloud/update-from-git.sh
```

## 日常发布流程

### 本地

```bash
git add .
git commit -m "Your change"
npm run deploy:tencentcloud:git
```

这条命令会自动完成：

- 把当前分支推送到 `origin`
- SSH 登录服务器
- 在服务器执行 `deploy/tencentcloud/update-from-git.sh`
- 自动检查 `https://pawtrip.pet/judgewrite/` 页面和公网健康接口是否可访问
- 输出简短发布摘要：线上提交号、发布时间、健康检查结果

前提条件：

- 当前工作区没有未提交改动
- 你已经完成本次改动的 `git commit`
- 当前所在分支就是你要发布的分支

### 服务器手动发布

如果你需要跳过本地一键命令，仍然可以在服务器手动执行：

```bash
cd /srv/judgewrite
bash deploy/tencentcloud/update-from-git.sh
```

## 可选参数

默认发布 `main` 分支全部服务。

如果你要指定分支：

```bash
DEPLOY_BRANCH=develop npm run deploy:tencentcloud:git
```

如果你只想发布前端：

```bash
DEPLOY_SERVICE=web npm run deploy:tencentcloud:git
```

如果你只想发布后端：

```bash
DEPLOY_SERVICE=api npm run deploy:tencentcloud:git
```

如果你想调整公网检查重试次数：

```bash
PUBLIC_CHECK_RETRIES=15 PUBLIC_CHECK_INTERVAL=2 npm run deploy:tencentcloud:git
```

## 当前线上地址

- 页面地址：`https://pawtrip.pet/judgewrite/`
- 健康检查：`https://pawtrip.pet/judgewrite/api/health`

## 注意事项

- 不要把线上 `.env` 提交到 Git 仓库
- 如果服务器使用私有仓库，请提前配置 deploy key 或服务器 SSH key
- 服务器发布默认使用 `git pull --ff-only`，避免隐藏冲突
- 更新 Caddy 或域名路由时，仍然需要单独处理 `pawtripserver` 的配置
