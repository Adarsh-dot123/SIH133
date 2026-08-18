from typing import List
from fastapi import APIRouter
from app.schemas import IoTTelemetryItem
from app.services.iot_daemon import iot_daemon

router = APIRouter(prefix="/iot", tags=["IoT Telemetry"])

@router.get("/telemetry", response_model=List[IoTTelemetryItem])
def get_live_iot_telemetry():
    return iot_daemon.get_live_telemetry()
