@echo off
echo ========================================
echo   Life Orchestrator - Complete System
echo ========================================
echo.

echo Starting services...
echo.

REM Start Python agent
echo [1/2] Starting Life Orchestrator Agent...
start "Life Orchestrator Agent" cmd /k "cd ai_agent && py smart_server.py"

timeout /t 3 /nobreak > nul

REM Start Node.js server
echo [2/2] Starting Node.js Server...
start "Node.js Server" cmd /k "node simple-server.js"

timeout /t 3 /nobreak > nul

echo.
echo ✅ All services started!
echo.
echo 🌐 Dashboard: http://localhost:3000
echo 🤖 AI Agent: http://localhost:8000
echo 📚 API Docs: http://localhost:8000/docs
echo.
echo Press any key to open the dashboard...
pause > nul
start http://localhost:3000
