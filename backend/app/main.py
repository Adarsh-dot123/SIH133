import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine, Base
from app.seed.seed_data import seed_database
from app.routes.auth import router as auth_router
from app.routes.hospitals import router as hospitals_router
from app.routes.beds import router as beds_router
from app.routes.predictions import router as predictions_router
from app.routes.referrals import router as referrals_router
from app.routes.ambulances import router as ambulances_router
from app.routes.admin import router as admin_router
from app.routes.simulation import router as simulation_router
from app.routes.iot import router as iot_router
from app.routes.audit import router as audit_router
from app.routes.abdm import router as abdm_router
from app.routes.rural_access import router as rural_router
from app.routes.voice import router as voice_router
from app.routes.reports import router as reports_router
from app.routes.ws import ws_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database tables exist and seed initial demo data
    print("Starting up MedFlow backend...")
    seed_database()
    
    # Seed demo users & doctor profiles for video calls and auth
    from app.database import SessionLocal
    from app.services.seed_users import seed_users
    db = SessionLocal()
    try:
        seed_users(db)
    finally:
        db.close()
    
    import asyncio
    from app.services.excel_watcher import start_excel_watcher_task
    # Start Excel watcher background loop
    watcher_task = asyncio.create_task(start_excel_watcher_task())
    
    yield
    print("Shutting down MedFlow backend...")
    watcher_task.cancel()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="MedFlow: Real-Time Predictive Hospital Resource Management Platform for India",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routes.complaints import router as complaints_router

# Include Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(hospitals_router, prefix=settings.API_V1_STR)
app.include_router(beds_router, prefix=settings.API_V1_STR)
app.include_router(predictions_router, prefix=settings.API_V1_STR)
app.include_router(referrals_router, prefix=settings.API_V1_STR)
app.include_router(ambulances_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)
app.include_router(simulation_router, prefix=settings.API_V1_STR)
app.include_router(iot_router, prefix=settings.API_V1_STR)
app.include_router(audit_router, prefix=settings.API_V1_STR)
app.include_router(abdm_router, prefix=settings.API_V1_STR)
app.include_router(rural_router, prefix=settings.API_V1_STR)
app.include_router(voice_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(complaints_router, prefix=settings.API_V1_STR)
app.include_router(ws_router) # WebSocket at /ws/live

@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "platform": "MedFlow",
        "version": "1.0.0",
        "primary_differentiator": "Predictive Bed Turnover Engine (12-24h Clinical Forecast)",
        "coverage": "Tamil Nadu & Karnataka Tertiary Hubs"
    }
