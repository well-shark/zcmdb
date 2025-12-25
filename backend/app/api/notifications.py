from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.notification import Notification
from app.models.asset import Asset
from app.schemas.notification import Notification as NotificationSchema, NotificationUpdate
from app.api.deps import get_current_active_user
from app.models.user import User

router = APIRouter(prefix="/notifications", tags=["通知管理"])


@router.get("", response_model=dict)
async def get_notifications(
    is_read: Optional[bool] = Query(None),
    notification_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取通知列表"""
    query = db.query(Notification)
    
    if is_read is not None:
        query = query.filter(Notification.is_read == is_read)
    
    if notification_type:
        query = query.filter(Notification.notification_type == notification_type)
    
    total = query.count()
    unread_count = db.query(Notification).filter(Notification.is_read == False).count()
    
    notifications = query.order_by(Notification.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    result = []
    for notif in notifications:
        asset_name = None
        if notif.asset_id:
            asset = db.query(Asset).filter(Asset.id == notif.asset_id).first()
            if asset:
                asset_name = asset.name
        
        result.append({
            "id": notif.id,
            "asset_id": notif.asset_id,
            "asset_name": asset_name,
            "notification_type": notif.notification_type,
            "message": notif.message,
            "is_read": notif.is_read,
            "expires_at": notif.expires_at,
            "created_at": notif.created_at,
        })
    
    return {
        "total": total,
        "unread_count": unread_count,
        "page": page,
        "page_size": page_size,
        "items": result
    }


@router.put("/{notification_id}/read", status_code=status.HTTP_200_OK)
async def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """标记通知为已读"""
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="通知不存在",
        )
    
    notification.is_read = True
    db.commit()
    
    return {"message": "已标记为已读"}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """删除通知"""
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="通知不存在",
        )
    
    db.delete(notification)
    db.commit()
    return None

