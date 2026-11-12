@echo off
echo ===================================================
echo     SecureSave - Local Educational Web Server
echo ===================================================
echo.
echo Launching local web server at http://localhost:8000 ...
echo Press Ctrl+C in this window anytime to stop the server.
echo.

start "" "http://localhost:8000"
python -m http.server 8000
