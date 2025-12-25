# GitHub Actions CI/CD 工作流说明

## 工作流文件

### 1. `.github/workflows/ci-cd.yml`
主要的CI/CD工作流，包含以下功能：

- **代码检查**：
  - 后端：使用 `flake8`、`black`、`isort` 进行代码质量检查
  - 前端：使用 `ESLint` 进行代码检查

- **构建Docker镜像**：
  - 自动构建后端和前端Docker镜像
  - 推送到 GitHub Container Registry (ghcr.io)
  - 支持多标签（分支名、PR、版本号、SHA）

- **创建Release**：
  - 当推送带 `v*` 格式的标签时自动创建GitHub Release
  - 包含docker-compose.yml和README.md文件

### 2. `.github/workflows/release.yml`
手动触发的工作流，用于创建新版本：

- 在GitHub Actions页面手动触发
- 输入版本号（如：v1.0.0）
- 自动创建Git标签并触发CI/CD流程

## 使用方法

### 1. 设置GitHub仓库

1. 将代码推送到GitHub仓库
2. 确保仓库设置为公开或已配置适当的权限

### 2. 自动CI/CD流程

每次推送到 `main` 或 `master` 分支时：
- 自动运行代码检查
- 自动构建Docker镜像
- 镜像推送到 `ghcr.io/<username>/<repo-name>-backend` 和 `ghcr.io/<username>/<repo-name>-frontend`

### 3. 创建Release

#### 方法一：使用Git标签（推荐）

```bash
# 1. 更新版本号
git tag -a v1.0.0 -m "Release version 1.0.0"

# 2. 推送标签
git push origin v1.0.0
```

推送标签后，GitHub Actions会自动：
- 运行所有检查
- 构建镜像
- 创建GitHub Release

#### 方法二：使用GitHub Actions手动触发

1. 进入GitHub仓库的Actions页面
2. 选择"Release"工作流
3. 点击"Run workflow"
4. 输入版本号（如：v1.0.0）
5. 点击"Run workflow"按钮

### 4. 使用发布的镜像

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

### 5. 拉取镜像

```bash
# 登录到GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u <username> --password-stdin

# 拉取镜像
docker pull ghcr.io/<username>/<repo-name>-backend:v1.0.0
docker pull ghcr.io/<username>/<repo-name>-frontend:v1.0.0
```

## 注意事项

1. **GitHub Token**：工作流使用 `GITHUB_TOKEN`，这是GitHub自动提供的，无需额外配置

2. **Container Registry权限**：如果仓库是私有的，需要确保GitHub Actions有权限推送镜像

3. **版本号格式**：建议使用语义化版本号（Semantic Versioning），如 `v1.0.0`、`v1.1.0`、`v2.0.0`

4. **代码检查**：如果代码检查失败，构建步骤不会执行。需要先修复代码问题

5. **缓存**：工作流使用GitHub Actions缓存来加速Docker构建

## 故障排查

### 镜像推送失败
- 检查仓库权限设置
- 确认 `GITHUB_TOKEN` 有足够权限

### 代码检查失败
- 查看Actions日志了解具体错误
- 修复代码后重新推送

### Release创建失败
- 确认标签格式正确（以 `v` 开头）
- 检查是否有重复的标签

