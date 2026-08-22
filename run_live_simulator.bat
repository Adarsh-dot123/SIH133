@echo off
title MedFlow Real-Time Dynamic Portal Updater
echo ==========================================================
echo Starting MedFlow Real-Time Dynamic Update Simulation...
echo ==========================================================
echo.
cd backend
python simulate_live_updates.py
pause
