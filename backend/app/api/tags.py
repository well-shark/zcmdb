from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.tag import Tag
from app.schemas.tag import TagCreate, TagUpdate, Tag as TagSchema
from app.api.deps import get_current_active_user, get_current_admin_user
from app.models.user import User

router = APIRouter(prefix="/tags", tags=["标签管理"])


@router.get("", response_model=List[TagSchema])
async def get_tags(
    key: Optional[str] = Query(None),
    value: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取标签列表"""
    query = db.query(Tag)
    
    if key:
        query = query.filter(Tag.key == key)
    if value:
        query = query.filter(Tag.value == value)
    
    tags = query.all()
    return tags


@router.post("", response_model=TagSchema, status_code=status.HTTP_201_CREATED)
async def create_tag(
    tag_in: TagCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """创建标签"""
    # 检查是否已存在
    existing = db.query(Tag).filter(
        Tag.key == tag_in.key,
        Tag.value == tag_in.value
    ).first()
    
    if existing:
        return existing
    
    tag = Tag(key=tag_in.key, value=tag_in.value)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.put("/{tag_id}", response_model=TagSchema)
async def update_tag(
    tag_id: int,
    tag_in: TagUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """更新标签"""
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="标签不存在",
        )
    
    # 检查是否已存在相同的键值对（排除当前标签）
    existing = db.query(Tag).filter(
        Tag.key == tag_in.key,
        Tag.value == tag_in.value,
        Tag.id != tag_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="标签已存在",
        )
    
    tag.key = tag_in.key
    tag.value = tag_in.value
    db.commit()
    db.refresh(tag)
    return tag


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    tag_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """删除标签"""
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="标签不存在",
        )
    
    db.delete(tag)
    db.commit()
    return None


@router.post("/assets/{asset_id}/tags", status_code=status.HTTP_200_OK)
async def add_asset_tags(
    asset_id: int,
    tag_ids: List[int] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """为资产添加标签"""
    from app.models.asset import Asset
    
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="资产不存在",
        )
    
    # 获取要添加的标签
    tags = db.query(Tag).filter(Tag.id.in_(tag_ids)).all()
    if len(tags) != len(tag_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="部分标签不存在",
        )
    
    # 添加标签（避免重复）
    existing_tag_ids = {tag.id for tag in asset.tags}
    new_tags = [tag for tag in tags if tag.id not in existing_tag_ids]
    asset.tags.extend(new_tags)
    db.commit()
    db.refresh(asset)
    
    return {
        "message": "标签添加成功",
        "tags": [{"id": t.id, "key": t.key, "value": t.value} for t in asset.tags]
    }


@router.delete("/assets/{asset_id}/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_asset_tag(
    asset_id: int,
    tag_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """移除资产标签"""
    from app.models.asset import Asset
    
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="资产不存在",
        )
    
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="标签不存在",
        )
    
    if tag in asset.tags:
        asset.tags.remove(tag)
        db.commit()
    
    return None


@router.get("/assets/{asset_id}/tags", response_model=List[TagSchema])
async def get_asset_tags(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取资产的标签列表"""
    from app.models.asset import Asset
    
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="资产不存在",
        )
    
    db.refresh(asset, ["tags"])
    return asset.tags


@router.put("/assets/{asset_id}/tags", status_code=status.HTTP_200_OK)
async def set_asset_tags(
    asset_id: int,
    tag_ids: List[int] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """设置资产的标签（替换所有标签，管理员）"""
    from app.models.asset import Asset
    
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="资产不存在",
        )
    
    # 获取要设置的标签
    tags = db.query(Tag).filter(Tag.id.in_(tag_ids)).all()
    if len(tags) != len(tag_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="部分标签不存在",
        )
    
    # 替换所有标签
    asset.tags = tags
    db.commit()
    db.refresh(asset)
    
    return {
        "message": "标签设置成功",
        "tags": [{"id": t.id, "key": t.key, "value": t.value} for t in asset.tags]
    }

