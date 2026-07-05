# QQZhu（主播歌单）

前端+后端（aiohttp + sqlite）。支持前台展示、后台增删改、备份/恢复、首登设置后台 token。

**v1.1 新功能：多租户支持** — 单进程托管多个主播，通过子域名区分，内存占用大幅降低。

---

## 本地启动（单租户）

1) 准备环境：Python 3.10+，安装依赖
```bash
pip install -r requirements.txt
```

2) 配置：
- 复制 `config.ini`，按需修改端口/数据库路径
- 首次启动会自动创建 DB 和表

3) 启动：
```bash
python server.py
```
访问 `http://localhost:13897/`。若未设置后台口令，首次访问后台会跳转到 token 初始化页。

---

## 多租户部署

一个 Python 进程托管多个主播，通过**子域名**区分：

| 访问地址 | 对应主播 |
|----------|----------|
| `alice.example.com` | Alice |
| `bob.example.com` | Bob |
| `example.com` | 超级管理员 |

### 1. 配置 Nginx（宝塔）

在宝塔「网站」中添加站点，绑定 `*.example.com` 泛域名，配置反向代理：

```
目标 URL: http://127.0.0.1:13897
发送域名: $host
```

或参考 `nginx.example.conf`。

### 2. 设置超级管理员 Token

```bash
# 方式一：环境变量
export QQZHU_SUPER_ADMIN_TOKEN="your-secret-token"

# 方式二：写入 .env 文件
echo "QQZHU_SUPER_ADMIN_TOKEN=your-secret-token" >> .env
```

### 3. 启动服务

```bash
python server.py
```

访问主域名 `example.com` → 进入超级管理员后台，创建租户。
每个租户首次访问后台时会引导设置独立的 admin token。

### 4. 数据存储

```
instance/
├── tenants.db          # 主控库（租户列表）
├── alice.db            # Alice 的歌曲+设置
├── bob.db              # Bob 的歌曲+设置
└── ...

static/uploads/
├── alice/              # Alice 上传的文件
├── bob/                # Bob 上传的文件
└── ...
```

---

## Docker 启动

```bash
# 单租户
docker compose up -d

# 多租户（设置超级管理员 token）
QQZHU_SUPER_ADMIN_TOKEN=your-token docker compose up -d
```

默认：
- 服务监听 13897（容器内 8080）
- 持久化 `./instance` 和 `./static/uploads`
- 内置健康检查（访问 `/healthz`）

修改端口：调整 `docker-compose.yml` 的 `ports`（如 `9000:8080`）。

---

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `QQZHU_PORT` | 服务端口 | 8080 |
| `QQZHU_DB_PATH` | 单租户数据库路径 | `instance/qqzhu.db` |
| `QQZHU_ADMIN_TOKEN` | 单租户后台 Token | 空（需初始化） |
| `QQZHU_SUPER_ADMIN_TOKEN` | 超级管理员 Token | 空（需初始化） |
| `QQZHU_SINGLE_TENANT` | 强制单租户模式（`true`/`1`） | 关闭 |
| `QQZHU_FONT_PATH` | 自定义字体路径 | 自动检测 |

---

## 健康检查

- 路由：`GET /healthz`，返回 `ok`。
- Compose 已配置 healthcheck，可用于探活或负载均衡。
