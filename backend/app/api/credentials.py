from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.credential import Credential
from app.models.asset import Asset
from app.schemas.asset import CredentialCreate, Credential as CredentialSchema
from app.api.deps import get_current_active_user, get_current_admin_user
from app.models.user import User
from app.core.encryption import encrypt_value, decrypt_value

router = APIRouter(prefix="/credentials", tags=["凭据管理"])


@router.get("/assets/{asset_id}/credentials", response_model=List[CredentialSchema])
async def get_asset_credentials(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取资产凭据列表"""
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="资产不存在",
        )
    
    credentials = db.query(Credential).filter(Credential.asset_id == asset_id).all()
    
    result = []
    for cred in credentials:
        cred_dict = {
            "id": cred.id,
            "asset_id": cred.asset_id,
            "credential_type": cred.credential_type,
            "key": cred.key,
            "description": cred.description,
            "created_at": cred.created_at,
        }
        
        # 只有管理员可以看到明文
        if current_user.is_admin:
            cred_dict["value"] = decrypt_value(cred.value_encrypted)
        else:
            cred_dict["value"] = None
            cred_dict["value_encrypted"] = None
        
        result.append(cred_dict)
    
    return result


@router.post("/assets/{asset_id}/credentials", response_model=CredentialSchema, status_code=status.HTTP_201_CREATED)
async def create_credential(
    asset_id: int,
    credential_in: CredentialCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """创建凭据（管理员）"""
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="资产不存在",
        )
    
    credential = Credential(
        asset_id=asset_id,
        credential_type=credential_in.credential_type,
        key=credential_in.key,
        value_encrypted=encrypt_value(credential_in.value),
        description=credential_in.description
    )
    db.add(credential)
    db.commit()
    db.refresh(credential)
    
    return {
        "id": credential.id,
        "asset_id": credential.asset_id,
        "credential_type": credential.credential_type,
        "key": credential.key,
        "value": decrypt_value(credential.value_encrypted),
        "description": credential.description,
        "created_at": credential.created_at,
    }


@router.get("/{credential_id}/decrypt", response_model=dict)
async def decrypt_credential(
    credential_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """解密凭据（管理员）"""
    credential = db.query(Credential).filter(Credential.id == credential_id).first()
    if not credential:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="凭据不存在",
        )
    
    return {
        "value": decrypt_value(credential.value_encrypted)
    }


@router.delete("/{credential_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_credential(
    credential_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """删除凭据（管理员）"""
    credential = db.query(Credential).filter(Credential.id == credential_id).first()
    if not credential:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="凭据不存在",
        )
    
    db.delete(credential)
    db.commit()
    return None

