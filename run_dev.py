"""
MedFlow Full-Stack Launcher
Starts both FastAPI backend (Port 8000) and React/Vite frontend (Port 5173) concurrently.
"""

import os
import sys
import subprocess
import time
import signal

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")

def main():
    print("=" * 65)
    print("  🚀 Starting MedFlow Full-Stack Platform")
    print("=" * 65)
    print(f"  Root Dir     : {ROOT_DIR}")
    print(f"  Backend URL  : http://localhost:8000 (API & Swagger: http://localhost:8000/docs)")
    print(f"  Frontend URL : http://localhost:5173")
    print("=" * 65)

    processes = []

    try:
        # Start Backend
        print("\n[1/2] Launching FastAPI Backend on http://localhost:8000 ...")
        backend_proc = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
            cwd=BACKEND_DIR,
            shell=(os.name == 'nt')
        )
        processes.append(backend_proc)

        # Brief delay to allow backend socket binding
        time.sleep(2)

        # Start Frontend
        print("\n[2/2] Launching Vite Frontend on http://localhost:5173 ...")
        npm_cmd = "npm.cmd" if os.name == 'nt' else "npm"
        frontend_proc = subprocess.Popen(
            [npm_cmd, "run", "dev"],
            cwd=FRONTEND_DIR,
            shell=(os.name == 'nt')
        )
        processes.append(frontend_proc)

        print("\n" + "=" * 65)
        print("  ✅ MedFlow is live!")
        print("  - Web App UI : http://localhost:5173")
        print("  - API Docs   : http://localhost:8000/docs")
        print("  - Press Ctrl+C at any time to stop both servers.")
        print("=" * 65 + "\n")

        # Wait for user interrupt or process exit
        while True:
            for p in processes:
                if p.poll() is not None:
                    print(f"Process {p.pid} terminated.")
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n\nShutting down MedFlow servers...")
    finally:
        for p in processes:
            try:
                if os.name == 'nt':
                    subprocess.call(['taskkill', '/F', '/T', '/PID', str(p.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                else:
                    p.terminate()
            except Exception:
                pass
        print("All servers stopped successfully.")

if __name__ == "__main__":
    main()
