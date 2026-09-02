@echo off
set DEBUG=false
if "%1"=="--debug" set DEBUG=true

echo === Building and starting Seating Arrangement Manager ===

docker rm -f seating-solver seating-ui seating-nginx 2>nul
docker network create seating 2>nul

echo Building solver...
docker build -t seating-solver ./solver
if %errorlevel% neq 0 exit /b %errorlevel%

echo Building UI...
docker build -t seating-ui ./ui
if %errorlevel% neq 0 exit /b %errorlevel%

if "%DEBUG%"=="true" (
  echo Generating large demo event...
  docker run --rm seating-solver python generate_demo.py > static\demo-event.json 2>nul
  echo Demo event generated.
) else (
  del /q static\demo-event.json 2>nul
)

echo Starting solver...
docker run -d --name seating-solver --network seating seating-solver

echo Starting UI (takes ~20s to bundle)...
docker run -d --name seating-ui --network seating seating-ui

echo Starting nginx...
docker run -d --name seating-nginx --network seating -p 80:80 -v "%cd%\nginx.conf:/etc/nginx/conf.d/default.conf:ro" -v "%cd%\static:/static:ro" nginx:alpine

echo Waiting for Expo to bundle...
:wait
timeout /t 2 /nobreak >nul
curl -s -o nul http://localhost && goto ready
goto wait

:ready
echo.
echo === Ready at http://localhost ===
if "%DEBUG%"=="true" echo Debug mode: large demo event loaded
echo Stop with: stop.bat
