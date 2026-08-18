from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import AuditLog
from app.schemas import AuditLogItem, AuditVerificationResponse
from app.services.audit_service import audit_service

router = APIRouter(prefix="/audit-logs", tags=["Blockchain Audit Trail"])

@router.get("", response_model=List[AuditLogItem])
def get_audit_logs(limit: int = 50, db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(limit).all()
    return logs

@router.get("/verify", response_model=AuditVerificationResponse)
def verify_audit_trail_integrity(db: Session = Depends(get_db)):
    return audit_service.verify_chain_integrity(db)
