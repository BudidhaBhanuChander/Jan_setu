from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db, Officer
from models import OfficerOut
from typing import List, Optional

router = APIRouter(prefix="/api/officers", tags=["Officers"])

@router.get("/", response_model=List[OfficerOut])
def list_officers(department_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Officer)
    if department_id:
        q = q.filter(Officer.department_id == department_id)
    return q.all()

@router.get("/{officer_id}", response_model=OfficerOut)
def get_officer(officer_id: int, db: Session = Depends(get_db)):
    return db.query(Officer).filter(Officer.id == officer_id).first()
