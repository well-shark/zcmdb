# ZCMDB 开发指南

## 目录

- [本地开发环境搭建](#本地开发环境搭建)
- [环境变量配置](#环境变量配置)
- [开发流程](#开发流程)
- [代码规范](#代码规范)
- [测试](#测试)
- [部署指南](#部署指南)
- [CI/CD 流程](#cicd-流程)
- [常见问题](#常见问题)

---

## 本地开发环境搭建

### 前置要求

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+（或使用 Docker）
- Git

### 后端开发环境

#### 1. 进入后端目录
```bash
cd backend
```

#### 2. 创建虚拟环境
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

#### 3. 安装依赖
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

#### 4. 配置环境变量
```bash
# 创建 .env 文件
cat > .env << EOF
POSTGRES_USER=zcmdb
POSTGRES_PASSWORD=zcmdb123
POSTGRES_DB=zcmdb
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
SECRET_KEY=your-secret-key-change-in-production
ENCRYPTION_KEY=your-32-byte-encryption-key-here-base64-encoded
CORS_ORIGINS=http://localhost:5173,http://localhost:80
ENVIRONMENT=development
EOF
```

#### 5. 启动PostgreSQL数据库
```bash
# 使用Docker启动PostgreSQL
docker run -d \
  --name zcmdb-postgres \
  -e POSTGRES_USER=zcmdb \
  -e POSTGRES_PASSWORD=zcmdb123 \
  -e POSTGRES_DB=zcmdb \
  -p 5432:5432 \
  postgres:15-alpine
```

#### 6. 启动后端服务
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

后端服务将在 http://localhost:8000 启动，API 文档在 http://localhost:8000/docs

### 前端开发环境

#### 1. 进入前端目录
```bash
cd frontend
```

#### 2. 安装依赖
```bash
npm install
```

#### 3. 启动开发服务器
```bash
npm run dev
```

前端服务将在 http://localhost:5173 启动

---

## 环境变量配置

### 后端环境变量

创建 `backend/.env` 文件，配置以下变量：

```bash
# 数据库配置
POSTGRES_USER=zcmdb
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=zcmdb
POSTGRES_HOST=localhost  # Docker环境使用 "postgres"，本地开发使用 "localhost"
POSTGRES_PORT=5432

# JWT 配置
SECRET_KEY=your_jwt_secret_key_here_change_in_production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440  # 24小时

# 加密配置（用于敏感信息加密）
ENCRYPTION_KEY=your_32_byte_encryption_key_here_base64_encoded

# CORS 配置
CORS_ORIGINS=http://localhost:3000,http://localhost:80,http://localhost:5173

# 默认管理员账号
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123
DEFAULT_ADMIN_EMAIL=admin@example.com

# 环境
ENVIRONMENT=development
```

### 生成加密密钥

生产环境必须配置 `ENCRYPTION_KEY`，可以使用以下命令生成：

```python
import base64
from cryptography.fernet import Fernet
key = Fernet.generate_key()
print(base64.urlsafe_b64encode(key).decode())
```

### 前端环境变量

创建 `frontend/.env` 文件（可选）：

```bash
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

---

## 开发流程

### 1. 后端开发

#### 添加新的资产类型

1. **创建模型** (`backend/app/models/new_asset.py`)
```python
from sqlalchemy import Column, Integer, String, ForeignKey
from app.database import Base

class NewAsset(Base):
    __tablename__ = "new_assets"
    
    id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), primary_key=True)
    # 添加扩展字段
    field1 = Column(String(200))
    field2 = Column(String(200))
```

2. **创建 Schema** (`backend/app/schemas/asset.py`)
```python
class NewAssetCreate(AssetCreate):
    asset_type: str = "new_asset"
    field1: Optional[str] = None
    field2: Optional[str] = None

class NewAsset(Asset):
    field1: Optional[str] = None
    field2: Optional[str] = None
```

3. **添加 API 处理逻辑** (`backend/app/api/assets.py`)
   - 在 `create_asset` 中添加处理逻辑
   - 在 `update_asset` 中添加处理逻辑
   - 在 `build_asset_response` 中添加响应构建逻辑

#### 添加新的 API 端点

1. **创建路由文件** (`backend/app/api/new_feature.py`)
```python
from fastapi import APIRouter, Depends
from app.api.deps import get_current_active_user
from app.models.user import User

router = APIRouter(prefix="/new-feature", tags=["新功能"])

@router.get("")
async def get_new_feature(
    current_user: User = Depends(get_current_active_user)
):
    return {"message": "新功能"}
```

2. **注册路由** (`backend/app/main.py`)
```python
from app.api import new_feature
app.include_router(new_feature.router, prefix=settings.API_V1_PREFIX)
```

### 2. 前端开发

#### 添加新的页面

1. **创建页面组件** (`frontend/src/pages/NewPage/index.jsx`)
```jsx
import React from 'react'
import { Typography } from 'antd'

const { Title } = Typography

const NewPage = () => {
  return (
    <div>
      <Title level={2}>新页面</Title>
    </div>
  )
}

export default NewPage
```

2. **添加路由** (`frontend/src/router/index.jsx`)
```jsx
import NewPage from '@/pages/NewPage'

// 在路由配置中添加
{
  path: 'new-page',
  element: <NewPage />
}
```

3. **添加菜单项** (`frontend/src/components/Layout/index.jsx`)
```jsx
{
  key: '/new-page',
  icon: <IconOutlined />,
  label: '新页面'
}
```

#### 添加新的 API 调用

1. **创建 API 文件** (`frontend/src/api/newFeature.js`)
```javascript
import api from './index'

export const getNewFeature = () => {
  return api.get('/new-feature')
}
```

2. **在组件中使用**
```jsx
import { getNewFeature } from '@/api/newFeature'

const MyComponent = () => {
  useEffect(() => {
    getNewFeature().then(data => {
      // 处理数据
    })
  }, [])
}
```

### 3. 数据库迁移

使用 Alembic 进行数据库迁移（规划中）：

```bash
# 创建迁移
alembic revision --autogenerate -m "描述"

# 执行迁移
alembic upgrade head

# 回滚迁移
alembic downgrade -1
```

目前开发环境使用自动创建表的方式（`Base.metadata.create_all`）。

---

## 代码规范

### Python 代码规范

#### 遵循 PEP 8
- 使用 4 个空格缩进
- 行长度不超过 120 字符
- 使用有意义的变量名
- 添加类型提示

#### 代码检查工具
```bash
# 安装检查工具
pip install flake8 black isort

# 检查代码
flake8 app --max-line-length=120

# 格式化代码
black app
isort app
```

#### 命名规范
- 类名：大驼峰（`UserManager`）
- 函数名：小写下划线（`get_user`）
- 常量：大写下划线（`MAX_RETRY`）
- 私有方法：下划线前缀（`_internal_method`）

### JavaScript/React 代码规范

#### 遵循 ESLint 规范
```bash
# 检查代码
npm run lint

# 自动修复
npm run lint -- --fix
```

#### 命名规范
- 组件名：大驼峰（`UserProfile`）
- 函数名：小驼峰（`getUserData`）
- 常量：大写下划线（`API_BASE_URL`）
- 私有方法：下划线前缀（`_handleInternal`）

#### React 最佳实践
- 使用函数组件和 Hooks
- 合理使用 `useState` 和 `useEffect`
- 避免不必要的重新渲染
- 使用 `React.memo` 优化性能

---

## 测试

### 后端测试（规划中）

```bash
# 安装测试依赖
pip install pytest pytest-asyncio httpx

# 运行测试
pytest

# 运行特定测试
pytest tests/test_users.py
```

### 前端测试（规划中）

```bash
# 安装测试依赖
npm install --save-dev @testing-library/react @testing-library/jest-dom

# 运行测试
npm test
```

---

## 部署指南

### Docker Compose 部署（推荐）

#### 1. 准备环境

确保已安装 Docker 和 Docker Compose。

#### 2. 配置环境变量

```bash
# 复制环境变量示例文件
cp .env.example .env

# 编辑 .env 文件，修改以下关键配置：
# - POSTGRES_PASSWORD: 数据库密码
# - SECRET_KEY: JWT 密钥（生产环境必须修改）
# - ENCRYPTION_KEY: 加密密钥（生产环境必须修改）
```

#### 3. 构建和启动

```bash
# 构建镜像并启动服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
```

#### 4. 访问服务

- 前端: http://localhost:80
- 后端 API: http://localhost:8000
- API 文档: http://localhost:8000/docs

#### 5. 停止服务

```bash
# 停止服务
docker-compose down

# 停止并删除数据卷（会删除数据库数据）
docker-compose down -v
```

### 生产环境部署

#### 1. 安全配置

**必须修改的配置**：
- `SECRET_KEY`: 使用强随机字符串
- `ENCRYPTION_KEY`: 使用生成的加密密钥
- `POSTGRES_PASSWORD`: 使用强密码
- `DEFAULT_ADMIN_PASSWORD`: 修改默认管理员密码

#### 2. 数据持久化

确保 Docker 数据卷正确挂载：
- PostgreSQL 数据: `postgres_data` 卷
- 上传文件: `backend_uploads` 卷

#### 3. 备份策略

定期备份 PostgreSQL 数据库：

```bash
# 备份数据库
docker exec zcmdb-postgres pg_dump -U zcmdb zcmdb > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复数据库
docker exec -i zcmdb-postgres psql -U zcmdb zcmdb < backup.sql
```

#### 4. 监控和日志

- 使用 `docker-compose logs` 查看日志
- 配置日志轮转（生产环境）
- 监控容器资源使用情况

### 构建 Docker 镜像

#### 后端镜像
```bash
cd backend
docker build -t zcmdb-backend:latest .
```

#### 前端镜像
```bash
cd frontend
docker build -t zcmdb-frontend:latest .
```

---

## CI/CD 流程

### GitHub Actions 工作流

项目配置了完整的 GitHub Actions CI/CD 流程，实现代码检查、镜像构建和自动发布。

### 工作流说明

#### 1. 代码检查

**后端检查**：
- `flake8`: Python 代码风格检查
- `black`: 代码格式化检查
- `isort`: 导入排序检查

**前端检查**：
- `ESLint`: JavaScript/React 代码检查

#### 2. 自动构建

- 推送到 `main` 或 `master` 分支时自动构建 Docker 镜像
- 镜像推送到 GitHub Container Registry (ghcr.io)
- 支持多标签（分支名、PR、版本号、SHA）

#### 3. 创建 Release

- 推送带 `v*` 格式的标签时自动创建 GitHub Release
- 包含 docker-compose.yml 和 README.md 文件

### 使用方法

#### 创建新版本 Release

**方法一：使用 Git 标签（推荐）**

```bash
# 1. 更新版本号并创建标签
git tag -a v1.0.0 -m "Release version 1.0.0"

# 2. 推送标签
git push origin v1.0.0
```

推送标签后，GitHub Actions 会自动：
- 运行所有检查
- 构建镜像
- 创建 GitHub Release

**方法二：使用 GitHub Actions 手动触发**

1. 进入 GitHub 仓库的 Actions 页面
2. 选择 "Release" 工作流
3. 点击 "Run workflow"
4. 输入版本号（如：v1.0.0）
5. 点击 "Run workflow" 按钮

#### 使用发布的镜像

在 `docker-compose.yml` 中更新镜像地址：

```yaml
services:
  backend:
    image: ghcr.io/<username>/<repo-name>-backend:v1.0.0
    # ...
  
  frontend:
    image: ghcr.io/<username>/<repo-name>-frontend:v1.0.0
    # ...
```

#### 拉取镜像

```bash
# 登录到 GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u <username> --password-stdin

# 拉取镜像
docker pull ghcr.io/<username>/<repo-name>-backend:v1.0.0
docker pull ghcr.io/<username>/<repo-name>-frontend:v1.0.0
```

### 工作流文件

- `.github/workflows/ci-cd.yml`: 主要的 CI/CD 工作流
- `.github/workflows/release.yml`: 手动触发 Release 的工作流
- `.github/workflows/README.md`: 详细的工作流说明文档

### 注意事项

1. **GitHub Token**: 工作流使用 `GITHUB_TOKEN`，这是 GitHub 自动提供的，无需额外配置

2. **Container Registry 权限**: 如果仓库是私有的，需要确保 GitHub Actions 有权限推送镜像

3. **版本号格式**: 建议使用语义化版本号（Semantic Versioning），如 `v1.0.0`、`v1.1.0`、`v2.0.0`

4. **代码检查**: 如果代码检查失败，构建步骤不会执行。需要先修复代码问题

5. **缓存**: 工作流使用 GitHub Actions 缓存来加速 Docker 构建

### 故障排查

#### 镜像推送失败
- 检查仓库权限设置
- 确认 `GITHUB_TOKEN` 有足够权限

#### 代码检查失败
- 查看 Actions 日志了解具体错误
- 修复代码后重新推送

#### Release 创建失败
- 确认标签格式正确（以 `v` 开头）
- 检查是否有重复的标签

---

## 常见问题

### 1. 数据库连接失败

**问题**: 无法连接到 PostgreSQL 数据库

**解决方案**:
- 检查 PostgreSQL 是否启动
- 检查环境变量中的数据库配置
- 检查网络连接
- 本地开发时确保 `POSTGRES_HOST=localhost`

### 2. Token 过期

**问题**: API 请求返回 401 错误

**解决方案**:
- Token 默认 24 小时过期
- 使用刷新 Token 接口获取新 Token
- 或重新登录

### 3. 权限不足

**问题**: 返回 403 错误

**解决方案**:
- 确认用户角色（管理员/普通用户）
- 管理员可以执行所有操作
- 普通用户只能查看，且看不到敏感信息
- 管理员账号不能被删除

### 4. 加密密钥问题

**问题**: 敏感信息加密/解密失败

**解决方案**:
- 生产环境必须配置 `ENCRYPTION_KEY`
- 密钥应该是 32 字节的 base64 编码字符串
- 使用提供的 Python 脚本生成密钥
- 密钥丢失后无法恢复加密数据

### 5. 前端页面空白

**问题**: 前端页面加载失败或空白

**解决方案**:
- 检查后端 API 是否正常运行
- 检查浏览器控制台错误
- 检查 API 基础 URL 配置
- 检查 CORS 配置

### 6. 密码修改失败

**问题**: 修改密码时提示错误

**解决方案**:
- 普通用户修改自己密码需要提供旧密码
- 管理员修改其他用户密码不需要旧密码
- 确保新密码长度至少 6 个字符
- 确认旧密码输入正确

### 7. Docker 构建失败

**问题**: Docker 镜像构建失败

**解决方案**:
- 检查 Dockerfile 语法
- 检查依赖文件是否存在
- 查看构建日志了解具体错误
- 确保 Docker 版本足够新

### 8. GitHub Actions 失败

**问题**: CI/CD 流程失败

**解决方案**:
- 查看 Actions 日志了解具体错误
- 检查代码检查是否通过
- 检查 Docker 构建是否成功
- 检查镜像推送权限

---

## 开发工具推荐

### 后端开发
- **IDE**: PyCharm / VS Code
- **API 测试**: Postman / Insomnia
- **数据库管理**: pgAdmin / DBeaver

### 前端开发
- **IDE**: VS Code
- **浏览器扩展**: React Developer Tools
- **API 测试**: 浏览器开发者工具

### 通用工具
- **Git**: 版本控制
- **Docker**: 容器化
- **Docker Compose**: 容器编排

---

## 贡献指南

### 提交代码

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码审查

- 确保代码通过所有检查
- 添加必要的测试
- 更新相关文档
- 遵循代码规范

---

## 总结

本文档提供了 ZCMDB 项目的完整开发指南，包括环境搭建、开发流程、代码规范、部署和 CI/CD 流程。遵循这些指南可以确保项目的可维护性和代码质量。

如有问题，请参考 [架构设计文档](ARCHITECTURE.md) 或提交 Issue。

