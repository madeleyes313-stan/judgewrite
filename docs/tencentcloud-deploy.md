# JudgeWrite 腾讯云部署方案

## 目标
- 先在腾讯云 `CVM` 上部署一个可公网访问的演示版
- 前端、后端、静态资源和 API 通过 Docker Compose 统一运行
- 使用服务器磁盘保存运行期数据，避免容器重启导致数据丢失

## 当前方案适用范围
适合：
- 演示
- 内测
- 小规模试用

暂不适合：
- 多用户高并发生产场景
- 严格合规归档
- 账号权限隔离
- 大规模文件存储

## 当前项目离“正式生产版”仍缺少的能力
### 还未完善
- 正式数据库：当前仍以 JSON 文件持久化为主
- 用户登录与权限：当前没有账号体系
- 对象存储：上传卷宗和导出文件未接入 COS
- 任务队列：当前抽取/生成任务还是单机线程模型
- 审计与监控：缺少统一日志、告警、备份策略

### 若要正式投入使用，建议后续补齐
- `TencentDB MySQL/PostgreSQL`
- `COS`
- `Redis`
- 登录/权限系统
- 后台任务队列
- HTTPS 域名与证书

## 本次已准备好的部署文件
- `apps/api/Dockerfile`
- `apps/web/Dockerfile`
- `deploy/tencentcloud/docker-compose.yml`
- `deploy/tencentcloud/nginx/web.conf`
- `deploy/tencentcloud/.env.example`
- `apps/api/.env.example`
- `apps/web/.env.production.example`

## 部署架构
### 单机演示版
1. 用户访问腾讯云 CVM 的 80/443 端口
2. Web 容器内的 Nginx 提供前端静态资源
3. Nginx 将 `/api` 反向代理到 FastAPI 容器
4. FastAPI 将运行数据持久化到挂载卷

## 服务器建议
- 机器类型：腾讯云 `CVM`
- 系统：`Ubuntu 22.04`
- 配置建议：至少 `2C4G`
- 磁盘：至少 `40GB`

## 当前已知你的环境
- 公网 IP：`49.232.72.156`
- 登录用户：`judgewrite`
- 域名：`pawtrip.pet`
- 域名已解析：是
- 真实模型 API：需要接入
- SSL 证书：暂未配置

## 仍需确认的信息
- 服务器真实操作系统版本
  - 建议执行：`cat /etc/os-release`
- SSH 是否已经允许 `judgewrite` 用户登录
- 你提供的是 SSH 公钥，不是私钥
  - 如果需要我远程替你执行，仍需要对应私钥或可用密码

## 服务器初始化步骤
以下步骤在腾讯云服务器上执行。
本文默认服务器是 `Ubuntu 22.04` 或兼容版本；如果不是，请先把 `cat /etc/os-release` 输出发我。

### 1. 安装 Docker 与 Compose
```bash
cd /srv/judgewrite
bash deploy/tencentcloud/server-setup-ubuntu.sh
```

重新登录一次服务器后继续。

### 2. 上传项目代码
可以使用 Git、SCP 或直接上传压缩包。

假设项目目录为：
```bash
/srv/judgewrite
```

### 3. 准备环境变量
```bash
cd /srv/judgewrite
cp deploy/tencentcloud/.env.example deploy/tencentcloud/.env
```

编辑 `deploy/tencentcloud/.env`：
- 临时测试可将 `WEB_PORT` 改成 `8080`
- 如果本机已有服务占用了同端口，可通过 `WEB_BIND_HOST` 绑定到指定公网 IP
- 如果前后端同域部署，`VITE_API_BASE_URL` 留空
- `JUDGEWRITE_CORS_ORIGINS` 保持为 `https://pawtrip.pet,http://pawtrip.pet`
- 若接入真实模型，填写 `OPENAI_API_KEY`

推荐填写为：
```env
WEB_PORT=80
WEB_BIND_HOST=0.0.0.0
VITE_API_BASE_URL=
JUDGEWRITE_CORS_ORIGINS=https://pawtrip.pet,http://pawtrip.pet
OPENAI_API_KEY=你的真实密钥
OPENAI_BASE_URL=
OPENAI_MODEL=gpt-4.1-mini
```

如果只是先测试，不影响现有站点，推荐改成：
```env
WEB_PORT=8080
WEB_BIND_HOST=49.232.72.156
VITE_API_BASE_URL=
JUDGEWRITE_CORS_ORIGINS=http://49.232.72.156:8080,http://pawtrip.pet,https://pawtrip.pet
OPENAI_API_KEY=
OPENAI_BASE_URL=
OPENAI_MODEL=gpt-4.1-mini
```

### 4. 启动服务
```bash
cd /srv/judgewrite
bash deploy/tencentcloud/deploy-on-server.sh /srv/judgewrite
```

### 5. 检查服务
```bash
docker compose ps
docker compose logs -f api
docker compose logs -f web
```

### 6. 验证
- 打开 `http://你的公网IP`
- 健康检查：`http://你的公网IP/api/health`
- 你的实际地址可先访问：
  - `http://49.232.72.156`
  - `http://pawtrip.pet`

## 数据持久化
当前部署会将运行数据写入 Docker volume：
- `runtime_cases.json`
- `archive_cases.json`
- `settings.json`

如果你希望改成服务器固定目录，也可以把 `docker-compose.yml` 中的 volume 改成 bind mount，例如：
```yaml
volumes:
  - /srv/judgewrite-data:/app/data/runtime
```

## HTTPS 建议
如果你已有域名，推荐后续增加 HTTPS，常见做法有两种：

### 方案 A：宿主机 Nginx + Certbot
- 宿主机监听 80/443
- 反向代理到容器内 80
- 使用 Let’s Encrypt 自动签证书
- 这是我推荐给 `pawtrip.pet` 的下一步方案

### 方案 B：腾讯云负载均衡/证书服务
- 域名解析到 CLB
- CLB 做 HTTPS 终止
- 后端容器继续跑 HTTP

## 后续正式化改造建议
优先级从高到低：
1. 接入数据库，替换 JSON 持久化
2. 接入 COS 存储卷宗和导出文件
3. 增加用户登录与权限
4. 将线程任务改为队列任务
5. 加入日志监控和备份

## 我还需要你提供的信息
为了继续把“部署到腾讯云”这件事做完，请给我：
- `cat /etc/os-release` 输出
- 你是否能提供 SSH 私钥或密码
- OpenAI 相关环境变量是否已准备好
- 腾讯云安全组是否已放行 `22/80/443`

有了这些信息后，我下一步可以继续帮你：
- 生成适配你域名的 Nginx 配置
- 生成最终 `.env`
- 检查安全组放行项
- 给出精确到命令级的腾讯云部署步骤
