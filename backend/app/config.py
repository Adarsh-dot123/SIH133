import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    PROJECT_NAME: str = "MedFlow"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "medflow_production_super_secret_key_jwt_2026_sih")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database configuration - defaults to SQLite for immediate zero-config demo, supports Postgres
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./medflow.db")
    GOOGLE_SHEET_URL: str = os.getenv("GOOGLE_SHEET_URL", "")
    
    # ML Model Config
    ML_MODEL_PATH: str = os.getenv("ML_MODEL_PATH", "app/services/discharge_model.pkl")
    
    # IoT Simulator
    IOT_TELEMETRY_INTERVAL_SEC: int = 5
    
    # CORS Origins
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    # Sarvam AI Configuration
    SARVAM_API_KEY: str = os.getenv("SARVAM_API_KEY", "")

settings = Settings()
