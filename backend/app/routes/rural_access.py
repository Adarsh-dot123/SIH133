from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import USSDQueryRequest, USSDQueryResponse, SMSQueryRequest, SMSQueryResponse
from app.services.rural_gateway import rural_gateway

router = APIRouter(prefix="/rural", tags=["Rural Inclusivity (USSD & SMS)"])

@router.post("/ussd", response_model=USSDQueryResponse)
def handle_ussd_query(payload: USSDQueryRequest, db: Session = Depends(get_db)):
    result = rural_gateway.process_ussd_session(
        session_id=payload.session_id,
        user_input=payload.user_input,
        db=db
    )
    return result

@router.post("/sms", response_model=SMSQueryResponse)
def handle_sms_query(payload: SMSQueryRequest, db: Session = Depends(get_db)):
    result = rural_gateway.process_sms_query(
        sender_phone=payload.sender_phone,
        message_body=payload.message_body,
        db=db
    )
    return result
