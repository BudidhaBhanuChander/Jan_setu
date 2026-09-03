
from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from database import get_db, User, Grievance
from auth import (
    verify_password, get_password_hash, create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user
)

router = APIRouter(prefix='/api/auth', tags=['Authentication'])

class UserCreate(BaseModel):
    username: str
    password: str
    name: str
    role: str = 'CITIZEN'
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    ward_colony: Optional[str] = None
    pincode: Optional[str] = None
    preferred_language: Optional[str] = 'en'
    department_id: Optional[int] = None
    zone_id: Optional[int] = None

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    ward_colony: Optional[str] = None
    pincode: Optional[str] = None
    preferred_language: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    name: str
    username: str

@router.post('/signup', response_model=Token)
@router.post('/register', response_model=Token)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail='Username or phone is already registered')
    
    hashed_password = get_password_hash(user.password)
    new_user = User(
        username=user.username,
        hashed_password=hashed_password,
        name=user.name,
        role=user.role,
        phone=user.phone or (user.username if user.username.isdigit() else None),
        email=user.email or (user.username if '@' in user.username else None),
        address=user.address,
        ward_colony=user.ward_colony,
        pincode=user.pincode,
        preferred_language=user.preferred_language or 'en',
        department_id=user.department_id,
        zone_id=user.zone_id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={'sub': new_user.username}, expires_delta=access_token_expires
    )
    return {
        'access_token': access_token, 
        'token_type': 'bearer', 
        'role': new_user.role, 
        'name': new_user.name,
        'username': new_user.username
    }

@router.post('/token', response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Incorrect username or password',
            headers={'WWW-Authenticate': 'Bearer'},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={'sub': user.username}, expires_delta=access_token_expires
    )
    return {
        'access_token': access_token, 
        'token_type': 'bearer', 
        'role': user.role, 
        'name': user.name,
        'username': user.username
    }

@router.get('/me')
def read_users_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Calculate grievances statistics for the user
    total_filed = db.query(func.count(Grievance.id)).filter(Grievance.citizen_id == current_user.id).scalar() or 0
    resolved_count = db.query(func.count(Grievance.id)).filter(
        Grievance.citizen_id == current_user.id,
        Grievance.status.in_(['RESOLVED', 'CLOSED'])
    ).scalar() or 0

    return {
        'id': current_user.id,
        'username': current_user.username,
        'name': current_user.name,
        'role': current_user.role,
        'phone': current_user.phone,
        'email': current_user.email,
        'address': current_user.address,
        'ward_colony': current_user.ward_colony,
        'pincode': current_user.pincode,
        'preferred_language': current_user.preferred_language,
        'department_id': current_user.department_id,
        'zone_id': current_user.zone_id,
        'created_at': current_user.created_at.isoformat() if current_user.created_at else None,
        'stats': {
            'total_filed': total_filed,
            'resolved': resolved_count,
            'pending': total_filed - resolved_count
        }
    }

@router.put('/profile')
def update_profile(data: ProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.name is not None:
        current_user.name = data.name
    if data.phone is not None:
        current_user.phone = data.phone
    if data.email is not None:
        current_user.email = data.email
    if data.address is not None:
        current_user.address = data.address
    if data.ward_colony is not None:
        current_user.ward_colony = data.ward_colony
    if data.pincode is not None:
        current_user.pincode = data.pincode
    if data.preferred_language is not None:
        current_user.preferred_language = data.preferred_language
        
    db.commit()
    db.refresh(current_user)
    return {'success': True, 'message': 'Profile updated successfully'}
