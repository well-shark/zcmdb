# ZCMDB 架构设计文档

## 目录

- [系统架构](#系统架构)
- [技术选型说明](#技术选型说明)
- [数据模型设计](#数据模型设计)
- [数据库设计](#数据库设计)
- [API 规范](#api-规范)
- [安全设计](#安全设计)

---

## 系统架构

### 整体架构

```
┌─────────────────────────────────────┐
│         表现层 (Presentation)       │
│      React 18 + Ant Design 5       │
└──────────────┬──────────────────────┘
               │ HTTP/HTTPS + JWT
┌──────────────▼──────────────────────┐
│        应用层 (Application)          │
│         FastAPI + Python            │
│  - RESTful API                      │
│  - 业务逻辑处理                      │
│  - 权限控制                          │
└──────────────┬──────────────────────┘
               │ SQL
┌──────────────▼──────────────────────┐
│         数据层 (Data)                │
│      PostgreSQL + SQLAlchemy        │
└─────────────────────────────────────┘
```

### 分层说明

#### 表现层（Frontend）
- **技术栈**: React 18 + Ant Design 5 + Vite
- **职责**: 用户界面展示、用户交互、数据展示
- **状态管理**: Zustand
- **路由**: React Router v6

#### 应用层（Backend）
- **技术栈**: FastAPI + Python 3.11
- **职责**: 
  - 处理业务逻辑
  - 提供 RESTful API
  - 权限验证和授权
  - 数据验证和转换
- **API 文档**: 自动生成 Swagger/OpenAPI 文档

#### 数据层（Database）
- **技术栈**: PostgreSQL 15 + SQLAlchemy ORM
- **职责**: 
  - 数据持久化
  - 数据关系管理
  - 数据完整性约束

---

## 技术选型说明

### 后端技术栈

#### FastAPI
- **选择理由**: 
  - 高性能异步 Web 框架
  - 自动生成 API 文档
  - 强大的类型提示支持
  - 基于 Python 标准类型提示
- **优势**: 
  - 开发效率高
  - 性能优秀（基于 Starlette 和 Pydantic）
  - 文档完善

#### PostgreSQL
- **选择理由**: 
  - 成熟的关系型数据库
  - 支持 JSONB 类型
  - 强大的查询能力
  - 良好的扩展性
- **优势**: 
  - 数据完整性保证
  - 支持复杂查询
  - 事务支持

#### SQLAlchemy
- **选择理由**: 
  - Python 最流行的 ORM
  - 支持多态继承
  - 数据库迁移支持
  - 灵活的查询 API
- **优势**: 
  - 代码可维护性强
  - 数据库无关性
  - 丰富的功能

#### JWT
- **选择理由**: 
  - 无状态认证
  - 易于扩展
  - 支持 Token 刷新
  - 标准化协议
- **优势**: 
  - 无需服务器端会话存储
  - 跨域支持
  - 微服务友好

### 前端技术栈

#### React 18
- **选择理由**: 
  - 组件化开发
  - 丰富的生态系统
  - 良好的性能
  - 活跃的社区
- **优势**: 
  - 可复用组件
  - 虚拟 DOM 优化
  - 单向数据流

#### Ant Design 5
- **选择理由**: 
  - 成熟的组件库
  - 丰富的组件
  - 良好的文档
  - 企业级设计
- **优势**: 
  - 开箱即用
  - 设计规范统一
  - 国际化支持

#### Zustand
- **选择理由**: 
  - 轻量级状态管理
  - 简单易用
  - 性能优秀
  - TypeScript 支持
- **优势**: 
  - 学习成本低
  - 代码简洁
  - 无需 Provider

---

## 数据模型设计

### 继承策略

采用**单表继承（Single Table Inheritance）**策略：

- 所有资产类型共享 `assets` 表
- 通过 `asset_type` 字段区分类型
- 每种类型有独立的扩展表
- **优点**: 查询简单，性能好
- **缺点**: 扩展表字段可能为空

### 多态关联

使用 SQLAlchemy 的 `polymorphic_identity` 实现多态：

```python
class Asset(Base):
    __tablename__ = 'assets'
    id = Column(Integer, primary_key=True)
    asset_type = Column(String(50))
    __mapper_args__ = {
        'polymorphic_identity': 'asset',
        'polymorphic_on': asset_type
    }

class ServerAsset(Asset):
    __tablename__ = 'server_assets'
    id = Column(Integer, ForeignKey('assets.id'), primary_key=True)
    __mapper_args__ = {
        'polymorphic_identity': 'server'
    }
```

### 关系设计

#### 资产与标签（多对多）
- 使用中间表 `asset_tags` 实现多对多关系
- 一个资产可以有多个标签
- 一个标签可以关联多个资产

#### 资产与凭据（一对多）
- 一个资产可以有多个凭据
- 凭据通过 `asset_id` 关联资产
- 支持凭据类型（password、ssh_key、api_key等）

#### 资产与用户（多对一）
- 资产通过 `created_by` 关联创建用户
- 支持查询用户创建的资产

---

## 数据库设计

### ER 关系图

```
User (用户)
  ├── id (PK)
  ├── username (唯一)
  ├── email
  ├── password_hash
  ├── is_admin
  ├── is_active
  └── created_at

Asset (资产) - 抽象基类
  ├── id (PK)
  ├── asset_type (资产类型)
  ├── name
  ├── description
  ├── created_at
  ├── updated_at
  └── created_by (FK -> User)

Tag (标签)
  ├── id (PK)
  ├── key
  ├── value
  └── created_at

AssetTag (资产标签关联表)
  ├── asset_id (FK -> Asset)
  └── tag_id (FK -> Tag)

Credential (凭据)
  ├── id (PK)
  ├── asset_id (FK -> Asset, nullable)
  ├── credential_type (凭据类型)
  ├── key (键名，如用户名)
  ├── value_encrypted (加密值)
  ├── description
  └── created_at

CloudAccount (云账号)
  ├── id (PK)
  ├── cloud_provider (云平台)
  ├── account_name (账号)
  ├── password_encrypted (密码)
  ├── phone (绑定手机)
  ├── balance (余额)
  └── created_at

CloudAccessKey (云访问密钥)
  ├── id (PK)
  ├── cloud_account_id (FK -> CloudAccount)
  ├── access_key (AK)
  ├── secret_key_encrypted (SK加密)
  ├── assigned_to (分配给)
  └── created_at

CloudAsset (云节点)
  ├── id (FK -> Asset, PK)
  ├── cloud_account_id (FK -> CloudAccount)
  ├── instance_id (实例ID)
  ├── region (地域)
  ├── zone (可用区)
  ├── expires_at (到期时间)
  └── ...

Notification (通知)
  ├── id (PK)
  ├── asset_id (FK -> Asset)
  ├── notification_type (通知类型)
  ├── message
  ├── is_read
  └── created_at
```

### 主要表结构

#### users 表
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### assets 表（单表继承）
```sql
CREATE TABLE assets (
    id SERIAL PRIMARY KEY,
    asset_type VARCHAR(50) NOT NULL,  -- server, cloud, software, system, database, hardware
    name VARCHAR(200) NOT NULL,
    description TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### tags 表
```sql
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL,
    value VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(key, value)
);
```

#### asset_tags 关联表
```sql
CREATE TABLE asset_tags (
    asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (asset_id, tag_id)
);
```

#### credentials 表
```sql
CREATE TABLE credentials (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
    credential_type VARCHAR(50) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value_encrypted TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### cloud_accounts 表
```sql
CREATE TABLE cloud_accounts (
    id SERIAL PRIMARY KEY,
    cloud_provider VARCHAR(50) NOT NULL,
    account_name VARCHAR(200) NOT NULL,
    password_encrypted TEXT,
    phone VARCHAR(20),
    balance NUMERIC(10, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### cloud_access_keys 表
```sql
CREATE TABLE cloud_access_keys (
    id SERIAL PRIMARY KEY,
    cloud_account_id INTEGER REFERENCES cloud_accounts(id) ON DELETE CASCADE,
    access_key VARCHAR(200) NOT NULL,
    secret_key_encrypted TEXT NOT NULL,
    assigned_to VARCHAR(200),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 资产扩展表

每种资产类型都有对应的扩展表：

- **server_assets**: 本地服务器（含网卡信息）
- **cloud_assets**: 云节点
- **software_assets**: 软件授权
- **system_assets**: 软件资产（内部系统）
- **database_assets**: 数据库
- **hardware_assets**: 硬件资产

详细表结构请参考代码中的模型定义（`backend/app/models/`）。

---

## API 规范

### 基础信息

- **Base URL**: `http://localhost:8000/api/v1`
- **认证方式**: Bearer Token (JWT)
- **Content-Type**: `application/json`

### 通用响应格式

#### 成功响应
```json
{
  "code": 200,
  "message": "success",
  "data": {...}
}
```

#### 分页响应
```json
{
  "code": 200,
  "data": {
    "total": 100,
    "page": 1,
    "page_size": 20,
    "items": [...]
  }
}
```

#### 错误响应
```json
{
  "detail": "错误描述信息"
}
```

### 主要 API 接口

#### 认证相关
- `POST /auth/login` - 用户登录
  - 请求: `FormData` (username, password)
  - 响应: `{ access_token: string, token_type: "bearer" }`
- `GET /auth/me` - 获取当前用户信息
  - 响应: 用户信息对象

#### 用户管理（管理员）
- `GET /users` - 获取用户列表（支持分页、搜索）
- `POST /users` - 创建用户
- `GET /users/{user_id}` - 获取用户详情
- `PUT /users/{user_id}` - 更新用户信息
- `PUT /users/{user_id}/password` - 修改密码（用户自己）
- `PUT /users/{user_id}/admin-password` - 管理员修改用户密码
- `DELETE /users/{user_id}` - 删除用户

#### 资产管理
- `GET /assets` - 获取资产列表（支持筛选、分页、搜索、标签过滤）
  - 查询参数: `asset_type`, `page`, `page_size`, `search`, `tags`
- `GET /assets/{asset_id}` - 获取资产详情
- `POST /assets` - 创建资产（管理员）
- `PUT /assets/{asset_id}` - 更新资产（管理员）
- `DELETE /assets/{asset_id}` - 删除资产（管理员）
- `GET /assets/field-values` - 获取字段值列表（用于自动完成）
- `GET /assets/batch-import/template/{asset_type}` - 下载导入模板
- `POST /assets/batch-import` - 批量导入资产（管理员）
- `GET /assets/expiring` - 获取即将到期的资产

#### 标签管理
- `GET /tags` - 获取标签列表（支持按key/value筛选）
- `POST /tags` - 创建标签
- `PUT /tags/{tag_id}` - 更新标签
- `DELETE /tags/{tag_id}` - 删除标签
- `GET /tags/assets/{asset_id}/tags` - 获取资产的标签
- `POST /tags/assets/{asset_id}/tags` - 为资产添加标签
- `PUT /tags/assets/{asset_id}/tags` - 设置资产的标签（替换）
- `DELETE /tags/assets/{asset_id}/tags/{tag_id}` - 移除资产标签

#### 凭据管理
- `GET /credentials/assets/{asset_id}/credentials` - 获取资产凭据列表
- `POST /credentials/assets/{asset_id}/credentials` - 创建凭据
- `DELETE /credentials/{credential_id}` - 删除凭据

#### 云账号管理（管理员）
- `GET /cloud-accounts` - 获取云账号列表
- `GET /cloud-accounts/{account_id}` - 获取云账号详情
- `POST /cloud-accounts` - 创建云账号
- `PUT /cloud-accounts/{account_id}` - 更新云账号
- `DELETE /cloud-accounts/{account_id}` - 删除云账号
- `POST /cloud-accounts/{account_id}/access-keys` - 创建访问密钥
- `PUT /cloud-accounts/{account_id}/access-keys/{key_id}` - 更新访问密钥
- `DELETE /cloud-accounts/{account_id}/access-keys/{key_id}` - 删除访问密钥

#### 通知管理
- `GET /notifications` - 获取通知列表
- `PUT /notifications/{notification_id}/read` - 标记为已读
- `DELETE /notifications/{notification_id}` - 删除通知

#### 文件管理
- `POST /files/license` - 上传授权文件
- `GET /files/license/{file_path}` - 下载授权文件

### 错误码说明

| 错误码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证或Token无效 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 422 | 数据验证失败 |
| 500 | 服务器内部错误 |

### API 文档

启动后端服务后，访问 http://localhost:8000/docs 查看交互式 API 文档（Swagger UI）。

---

## 安全设计

### 认证流程

1. 用户提交用户名密码
2. 后端验证密码（bcrypt）
3. 生成 JWT Token
4. 返回 Token 给前端
5. 前端存储 Token（localStorage）
6. 后续请求携带 Token（Authorization: Bearer <token>）
7. 后端验证 Token

### 权限控制

#### 角色定义
- **管理员（admin）**: 所有权限
  - 创建、编辑、删除资产
  - 查看所有敏感信息（明文）
  - 用户管理
  - 云账号管理
- **普通用户（user）**: 只读权限
  - 查看资产信息
  - 敏感信息隐藏（密码、授权码等显示为 `***` 或 `null`）
  - 修改自己的密码

#### 权限检查
- 使用依赖注入（Dependency Injection）实现权限检查
- `get_current_active_user`: 检查用户是否已登录
- `get_current_admin_user`: 检查用户是否为管理员

### 敏感信息加密

#### 加密算法
- 使用 **AES-256-GCM** 加密算法
- 主密钥存储在环境变量 `ENCRYPTION_KEY` 中
- 每个加密值使用随机 IV（Initialization Vector）

#### 加密范围
- 用户密码（bcrypt 哈希，非加密）
- 资产凭据（密码、授权码等）
- 云账号密码
- 云访问密钥（Secret Key）

#### 密钥管理
- 生产环境必须配置 `ENCRYPTION_KEY`
- 密钥应该是 32 字节的 base64 编码字符串
- 密钥丢失后无法恢复加密数据
- 建议定期轮换密钥（需要重新加密所有数据）

### 数据验证

#### 后端验证
- 使用 Pydantic 进行数据验证
- 自动生成验证错误信息
- 类型检查和格式验证

#### 前端验证
- 表单验证（Ant Design Form）
- IP 地址格式验证
- 数值范围验证
- 必填字段验证

### CORS 配置

- 支持配置多个允许的源
- 生产环境应限制为特定域名
- 开发环境可配置为 `*`（不推荐）

---

## 性能优化

### 数据库优化

- 使用索引加速查询
  - `assets.asset_type` 索引
  - `assets.created_by` 索引
  - `cloud_assets.expires_at` 索引
  - `tags.key` 索引
- 使用分页减少数据传输
- 使用关联查询减少数据库访问次数

### 前端优化

- 代码分割（Code Splitting）
- 懒加载路由
- 图片和资源优化
- 使用 Vite 进行快速构建

### 缓存策略

- 静态资源缓存
- API 响应缓存（规划中）
- 浏览器缓存策略

---

## 扩展性设计

### 资产类型扩展

添加新的资产类型只需：
1. 创建新的模型类（继承 `Asset`）
2. 创建对应的扩展表
3. 添加对应的 Schema
4. 在 API 中添加处理逻辑
5. 在前端添加对应的页面

### API 版本控制

- 当前版本: `/api/v1`
- 未来版本: `/api/v2`
- 支持多版本共存

### 插件系统（规划中）

- 支持自定义资产类型
- 支持自定义字段
- 支持自定义验证规则

---

## 监控和日志

### 日志记录

- 应用日志（FastAPI 日志）
- 错误日志
- 访问日志（规划中）

### 监控指标（规划中）

- API 响应时间
- 错误率
- 数据库连接数
- 系统资源使用情况

---

## 总结

ZCMDB 采用现代化的技术栈和架构设计，具有良好的可扩展性和可维护性。通过合理的分层设计、数据模型设计和安全设计，系统能够满足部门级资产管理的基本需求，同时为未来的功能扩展预留了空间。

