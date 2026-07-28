# QQZhu（主播歌单）v1.2

单进程多租户歌单管理系统。前端展示 + 后台管理 + 歌单图片生成 + 备份恢复。

> **核心优势**：一个 Python 进程托管 N 个主播，通过子域名区分，内存仅需一份。

---

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 启动

```bash
python server.py
```

默认端口由 `config.ini` 的 `[server] port` 决定（示例配置为 14000）。首次启动自动创建 `instance/tenants.db`（租户管理库）。

### 3. 配置 Nginx（宝塔）

添加站点，绑定 `*.your-domain.com` → 反向代理到 `127.0.0.1:14000`。

> **必须透传 Host 头**，否则多租户解析会失败（所有子域名都会被当成主域名）：
```nginx
location / {
    proxy_pass http://127.0.0.1:14000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```
宝塔面板里勾选「发送域名」即可，但若反代模板把 Host 写成 `127.0.0.1:端口`，需手动改成 `$host`。

---

## 架构

```
 alice.srelm.cn  ──┐
 bao.srelm.cn    ──┤
 zyy.srelm.cn    ──┤
 ...              ──┤
                    ▼
              Nginx (泛域名, 透传 Host/X-Forwarded-Host)
                    │
                    ▼
            QQZhu (单进程 :14000)
                    │
         优先 X-Forwarded-Host → 解析 slug → 对应数据库
         /super-admin* 路径 → 任意域名都走超管上下文
                    
 instance/          static/uploads/
 ├── tenants.db     ├── alice/
 ├── alice.db       ├── bao/
 ├── bao.db         ├── zyy/
 └── zyy.db         └── ...
```

> **超管后台访问**：不需要单独绑定主域名。任何子域名下访问 `/super-admin` 都会进入超管上下文（如 `alice.srelm.cn/super-admin`）。主域名（无子域名）访问根路径 `/` 也会自动跳转到超管后台。

---

## 租户管理

访问主域名（不带子域名）进入**超级管理员后台**。

### 设置超级管理员 Token

首次使用需设置 Token：

```bash
# 方式一：环境变量
export QQZHU_SUPER_ADMIN_TOKEN="你的密码"

# 方式二：写入 .env
echo "QQZHU_SUPER_ADMIN_TOKEN=你的密码" >> .env
```

或在超级管理员页面直接设置。

### 超级管理员功能

| 操作 | 说明 |
|------|------|
| 创建租户 | 输入标识（纯字母数字）+ 显示名称，自动初始化数据库 |
| 改名 | 修改子域名标识，同步更新数据库文件、上传目录、路径引用 |
| 禁用/启用 | 暂停或恢复某个主播的访问 |
| 删除 | 永久删除租户及其所有数据 |

### 租户自己管理

每个主播访问自己的子域名 `/admin`（如 `alice.srelm.cn/admin`），首次登录引导设置独立后台 Token，之后可独立管理歌单、站点信息。

---

## 路由

| 路径 | 说明 |
|------|------|
| `/` | 租户前台歌单展示（主域名访问会跳转超管后台） |
| `/admin` | 租户后台管理 |
| `/admin/login` | 租户后台登录 |
| `/admin/setup` | 租户首次 Token 设置 |
| `/super-admin` | 超级管理员（租户管理），任意子域名均可访问 |
| `/super-admin/login` | 超级管理员登录 |
| `/proxy-image` | 图片代理（仅允许 bilibili 系域名，防 SSRF） |
| `/healthz` | 健康检查 |

---

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `QQZHU_PORT` | 服务端口 | 以 `config.ini` 为准 |
| `QQZHU_SUPER_ADMIN_TOKEN` | 超级管理员 Token | 空 |
| `QQZHU_SINGLE_TENANT` | 单租户模式（`true`） | 关闭 |
| `QQZHU_FONT_PATH` | 自定义字体路径 | 自动检测 |
| `QQZHU_DB_PATH` | 单租户数据库路径 | `instance/qqzhu.db` |
| `QQZHU_ADMIN_TOKEN` | 单租户后台 Token | 空 |

---

## Docker

```bash
QQZHU_SUPER_ADMIN_TOKEN=你的密码 docker compose up -d
```

数据持久化在 `./instance/` 和 `./static/uploads/`。

---

## 数据存储

```
instance/
├── tenants.db       # 租户列表（主控库）
├── {slug}.db        # 各租户的歌单 + 站点设置

static/uploads/
└── {slug}/          # 各租户上传的背景图、歌手图等
```

---

## 备份恢复

各租户在后台可独立备份/恢复（支持 JSON 和 XLSX 格式），备份文件存储在 `backup/{slug}/`。

---

## 安全说明

- **图片代理**：`/proxy-image` 仅允许 bilibili 系域名（`hdslb.com`、`bilibili.com`、`bilivideo.com`、`bilivideo.cn`），禁止访问内网 IP，防止 SSRF。
- **Token 比较**：登录 Token 使用常量时间比较（`secrets.compare_digest`），防时序攻击。
- **登录限流**：同 IP 5 次失败后锁定 5 分钟，过期条目自动清理。
- **字体路径**：图片生成时的 `font_path` 禁止绝对路径与 `..`，防路径遍历。
- **删除租户**：标记删除中后拒绝新请求，避免并发请求使用已关闭的数据库连接。
- **建议**：用防火墙把后端端口（如 14000）限制为只允许 127.0.0.1 访问，避免绕过 Nginx 直连。

---

## 许可证

MIT
