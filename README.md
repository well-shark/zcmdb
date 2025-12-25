# ZCMDB - 资产管理系统

## 目录

- [项目简介](#项目简介)
- [主要特性](#主要特性)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [功能模块](#功能模块)
- [相关文档](#相关文档)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

---

## 项目简介

ZCMDB 是一个轻量级、部门级的资产管理与信息统计系统，用于各类型资源的管理工作。

### 项目定位

- **轻量级**：部署简单，资源占用少
- **部门级**：适合中小团队使用
- **信息管理**：专注于资产信息的记录和查询

---

## 主要特性

- 🔐 **用户认证**: 基于 JWT 的认证系统，支持管理员和普通用户角色
- 📦 **多类型资产管理**: 支持服务器、云节点、云账号、软件授权、软件资产、数据库、硬件等多种资产类型
- 🔒 **凭据管理**: 加密存储敏感信息（密码、授权码等），支持多组用户名密码
- 🏷️ **标签系统**: 灵活的标签管理，支持一键多值，支持编辑
- ⏰ **到期提醒**: 自动检测资产到期时间，提前提醒
- 📊 **统计报表**: 资产统计和可视化展示，近期到期资源面板
- 📥 **批量导入**: 支持 Excel 格式的批量导入，支持模板下载
- 🐳 **容器化部署**: Docker 和 Docker Compose 一键部署
- 🚀 **CI/CD**: 完整的 GitHub Actions 自动化流程

---

## 项目截图
![zcmdb](./docs/images/zcmdb.png)

## 技术栈

### 后端
- **框架**: FastAPI
- **数据库**: PostgreSQL
- **ORM**: SQLAlchemy
- **认证**: JWT (JSON Web Token)
- **加密**: Python cryptography (bcrypt + AES-256-GCM)

### 前端
- **框架**: React 18
- **UI 组件库**: Ant Design 5
- **状态管理**: Zustand
- **路由**: React Router v6
- **HTTP 客户端**: Axios
- **构建工具**: Vite

### 部署
- **容器化**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **镜像仓库**: GitHub Container Registry

---

## 快速开始

### 前置要求

- Docker 和 Docker Compose（推荐）
- 或 Python 3.11+ 和 Node.js 18+（本地开发）

### 方式一：使用 Docker Compose（推荐）

1. **克隆项目**
```bash
git clone <repository-url>
cd zcmdb
```

2. **配置环境变量**（可选）
```bash
# 在项目根目录创建 .env 文件
cp .env.example .env
# 编辑 .env 文件，配置数据库密码、JWT密钥等
```

3. **启动服务**
```bash
docker-compose up -d
```

4. **访问系统**
- 前端: http://localhost:80
- 后端 API: http://localhost:8000
- API 文档: http://localhost:8000/docs

5. **默认账号**
- 用户名: `admin`
- 密码: `admin123`（首次登录后请修改）

### 方式二：本地开发

详细说明请参考 [开发指南](docs/DEVELOPMENT.md)

---

## 项目结构

```
zcmdb/
├── backend/                 # 后端代码
│   ├── app/
│   │   ├── main.py          # FastAPI 应用入口
│   │   ├── config.py        # 配置管理
│   │   ├── database.py      # 数据库连接
│   │   ├── models/          # SQLAlchemy 模型
│   │   ├── schemas/         # Pydantic 模式
│   │   ├── api/             # API 路由
│   │   ├── core/            # 核心功能
│   │   └── utils/            # 工具函数
│   ├── requirements.txt     # Python 依赖
│   └── Dockerfile           # 后端镜像
├── frontend/                # React 前端代码
│   ├── src/
│   │   ├── main.jsx         # 入口文件
│   │   ├── router/          # 路由配置
│   │   ├── store/           # 状态管理
│   │   ├── api/             # API 调用
│   │   ├── pages/           # 页面组件
│   │   └── components/      # 公共组件
│   ├── package.json
│   └── Dockerfile           # 前端镜像
├── frontend_vue/            # Vue 前端代码（旧版）
├── docker-compose.yml       # Docker Compose 配置
├── .github/workflows/       # GitHub Actions 工作流
├── docs/                    # 文档目录
│   ├── ARCHITECTURE.md      # 架构设计文档
│   └── DEVELOPMENT.md       # 开发指南
├── .env.example             # 环境变量示例
├── .gitignore
└── README.md                # 本文档
```

---

## 功能模块

### 用户管理
- 用户登录/登出
- 用户创建（管理员）
- 密码修改（本人/管理员）
- 角色管理（管理员/普通用户）
- 个人资料页面

### 资产管理
- **服务器**: 记录服务器配置、IP地址、SSH信息、网卡等
- **云节点**: 管理云服务实例，支持多组登录凭据，关联云账号
- **云账号**: 管理云平台账号、余额、AK/SK及分配情况
- **软件授权**: 记录软件登录信息、授权码/授权文件等
- **软件资产**: 管理内部搭建的系统（Git、禅道等）
- **数据库**: 记录数据库连接信息
- **硬件资产**: 管理PC、笔记本、服务器等硬件设备

### 标签管理
- 创建/编辑/删除标签（键值对）
- 为资产添加标签
- 按标签筛选资产
- 支持一键多值

### 凭据管理
- 加密存储敏感信息（AES-256-GCM）
- 凭据与资产关联
- 支持多组用户名密码（如root、ubuntu等）
- 权限控制（普通用户不可见明文）
- 管理员可解密查看

### 到期提醒
- 仪表盘显示近期到期云节点资源
- 支持选择时间范围（三天、一周、两周、一月）
- 颜色标识剩余天数
- 通知中心展示（规划中）

### 批量操作
- 批量导入（Excel格式）
- 模板下载
- 批量选择和导出

---

## 相关文档

- [架构设计文档](docs/ARCHITECTURE.md) - 系统架构、数据库设计、API规范
- [开发指南](docs/DEVELOPMENT.md) - 本地开发、部署、CI/CD流程

---

## 开发计划

### 已完成功能 ✅

- ✅ 用户认证系统（JWT登录、权限控制）
- ✅ 用户管理（创建、编辑、删除、密码修改）
- ✅ 资产管理（7种资产类型：服务器、云节点、云账号、软件授权、软件资产、数据库、硬件）
- ✅ 标签管理（创建、编辑、删除、关联资产）
- ✅ 凭据管理（加密存储、权限控制、多组凭据）
- ✅ 通知管理（列表、标记已读、删除）
- ✅ 敏感信息加密（AES-256-GCM）
- ✅ 前端页面（React + Ant Design）
- ✅ 批量导入/导出功能
- ✅ 仪表盘（统计、到期提醒、快捷操作）
- ✅ CI/CD 流程（GitHub Actions）

### 待开发功能 📋

- 📋 到期提醒定时任务
- 📋 统计图表和报表
- 📋 操作日志记录
- 📋 数据库迁移工具（Alembic）

---

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 许可证

[待定]

---

## 联系方式

[待定]
