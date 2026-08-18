@echo off
title MedFlow Backend (FastAPI)
echo ===================================================
echo Starting MedFlow Backend on http://127.0.0.1:8000
echo ===================================================
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
