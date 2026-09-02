@echo off
docker rm -f seating-solver seating-ui seating-nginx 2>nul
docker network rm seating 2>nul
echo Stopped.
