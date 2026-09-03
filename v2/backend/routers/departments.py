from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db, Department
from models import DepartmentOut
from typing import List

router = APIRouter(prefix="/api/departments", tags=["Departments"])

@router.get("/", response_model=List[DepartmentOut])
def list_departments(db: Session = Depends(get_db)):
    return db.query(Department).all()
