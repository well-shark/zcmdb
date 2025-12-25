from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from app.api.deps import get_current_active_user
from app.models.user import User
import os
from pathlib import Path
from datetime import datetime
import uuid

router = APIRouter(prefix="/files", tags=["文件管理"])

# 确保上传目录存在
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

LICENSE_DIR = UPLOAD_DIR / "licenses"
LICENSE_DIR.mkdir(exist_ok=True)


@router.post("/license", status_code=status.HTTP_201_CREATED)
async def upload_license_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """上传授权文件"""
    # 检查文件类型
    allowed_extensions = {'.lic', '.key', '.txt', '.dat', '.bin', '.pem', '.crt', '.cer'}
    file_ext = Path(file.filename).suffix.lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的文件类型。允许的类型: {', '.join(allowed_extensions)}"
        )
    
    # 检查文件大小（最大10MB）
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="文件大小不能超过10MB"
        )
    
    # 生成唯一文件名
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    safe_filename = f"{timestamp}_{unique_id}{file_ext}"
    file_path = LICENSE_DIR / safe_filename
    
    # 保存文件
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # 返回相对路径（用于存储到数据库）
    relative_path = f"licenses/{safe_filename}"
    
    return {
        "file_path": relative_path,
        "filename": file.filename,
        "size": len(contents)
    }


@router.get("/license/{file_path:path}")
async def download_license_file(
    file_path: str,
    current_user: User = Depends(get_current_active_user)
):
    """下载授权文件"""
    # 安全检查：防止路径遍历
    if ".." in file_path or file_path.startswith("/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无效的文件路径"
        )
    
    full_path = UPLOAD_DIR / file_path
    
    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文件不存在"
        )
    
    return FileResponse(
        path=str(full_path),
        filename=full_path.name,
        media_type="application/octet-stream"
    )

