from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.models import *  # 导入所有模型
from app.api import auth, users, assets, tags, credentials, notifications, files, cloud_accounts, migration

app = FastAPI(
    title="ZCMDB API",
    description="轻量级部门级资产管理系统",
    version="1.0.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(users.router, prefix=settings.API_V1_PREFIX)
app.include_router(assets.router, prefix=settings.API_V1_PREFIX)
app.include_router(tags.router, prefix=settings.API_V1_PREFIX)
app.include_router(credentials.router, prefix=settings.API_V1_PREFIX)
app.include_router(notifications.router, prefix=settings.API_V1_PREFIX)
app.include_router(files.router, prefix=settings.API_V1_PREFIX)
app.include_router(cloud_accounts.router, prefix=settings.API_V1_PREFIX)
app.include_router(migration.router, prefix=settings.API_V1_PREFIX)


@app.get("/")
async def root():
    return {"message": "ZCMDB API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "ok"}


# 初始化数据库和默认管理员
@app.on_event("startup")
async def startup_event():
    """应用启动时初始化数据库和默认管理员"""
    try:
        # 创建数据库表
        Base.metadata.create_all(bind=engine)
        print("数据库表创建成功")
    except Exception as e:
        print(f"警告: 数据库表创建失败: {e}")
        print("请确保PostgreSQL数据库已启动并可访问")
    
    # 初始化默认管理员
    from app.database import SessionLocal
    from app.models.user import User
    from app.core.security import get_password_hash
    
    db = SessionLocal()
    try:
        # 检查是否已存在管理员
        admin = db.query(User).filter(User.username == settings.DEFAULT_ADMIN_USERNAME).first()
        if not admin:
            admin = User(
                username=settings.DEFAULT_ADMIN_USERNAME,
                email=settings.DEFAULT_ADMIN_EMAIL,
                password_hash=get_password_hash(settings.DEFAULT_ADMIN_PASSWORD),
                is_admin=True,
                is_active=True
            )
            db.add(admin)
            db.commit()
            print(f"默认管理员已创建: {settings.DEFAULT_ADMIN_USERNAME} / {settings.DEFAULT_ADMIN_PASSWORD}")
    except Exception as e:
        print(f"警告: 初始化默认管理员失败: {e}")
    finally:
        db.close()

