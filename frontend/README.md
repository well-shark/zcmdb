# ZCMDB Frontend (React)

基于 React + Ant Design 的前端应用

## 技术栈

- React 18
- Ant Design 5
- React Router v6
- Zustand (状态管理)
- Axios (HTTP客户端)
- Vite (构建工具)

## 开发

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173

### 构建生产版本

```bash
npm run build
```

## 项目结构

```
src/
├── api/           # API接口
├── components/    # 公共组件
│   └── Layout/    # 布局组件
├── pages/         # 页面组件
│   ├── Login/     # 登录页
│   ├── Dashboard/ # 仪表盘
│   ├── Users/     # 用户管理
│   └── Assets/    # 资产管理
├── router/        # 路由配置
├── store/         # 状态管理
├── utils/         # 工具函数
└── main.jsx       # 入口文件
```

## 环境变量

创建 `.env` 文件：

```
VITE_API_BASE_URL=http://localhost:8000/api/v1
```
