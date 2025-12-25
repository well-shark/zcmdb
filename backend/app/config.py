from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # 数据库配置
    POSTGRES_USER: str = "zcmdb"
    POSTGRES_PASSWORD: str = "zcmdb123"
    POSTGRES_DB: str = "zcmdb"
    POSTGRES_HOST: str = "localhost"  # Docker环境使用 "postgres"，本地开发使用 "localhost"
    POSTGRES_PORT: int = 5432
    
    # 后端配置
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    API_V1_PREFIX: str = "/api/v1"
    
    # JWT 配置
    SECRET_KEY: str = "ec4e4fd39ddb42de953ab4d6c6208a46eaf6c483230556fbb2a7305aa3d16f67"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24小时
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # 加密配置
    ENCRYPTION_KEY: str = "your-32-byte-encryption-key-here-base64-encoded"
    
    # CORS 配置
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:80", "http://localhost:5173"]
    
    # 环境
    ENVIRONMENT: str = "development"
    
    # 默认管理员
    DEFAULT_ADMIN_USERNAME: str = "admin"
    DEFAULT_ADMIN_PASSWORD: str = "admin123"
    DEFAULT_ADMIN_EMAIL: str = "admin@example.com"
    
    # 日志配置
    LOG_LEVEL: str = "INFO"
    
    @property
    def database_url(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

