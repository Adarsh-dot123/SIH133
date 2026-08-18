@echo off
title Launch MedFlow Fullstack Platform
echo =========================================================
echo Launching MedFlow Backend (FastAPI) and Frontend (Vite)...
echo =========================================================

start "MedFlow Backend" cmd /k "cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 2 /nobreak >nul

start "MedFlow Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers started!
echo Frontend: http://localhost:5173
echo Backend API Docs: http://127.0.0.1:8000/docs
echo.
