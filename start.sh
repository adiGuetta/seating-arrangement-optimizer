#!/bin/bash
set -e

DEBUG=false
if [ "$1" = "--debug" ]; then
  DEBUG=true
fi

echo "=== Building and starting Seating Arrangement Manager ==="

docker rm -f seating-solver seating-ui seating-nginx 2>/dev/null || true
docker network create seating 2>/dev/null || true

echo "Building solver..."
docker build -t seating-solver ./solver

echo "Building UI..."
docker build -t seating-ui ./ui

if [ "$DEBUG" = true ]; then
  echo "Generating large demo event..."
  docker run --rm seating-solver python generate_demo.py > static/demo-event.json 2>/dev/null
  echo "Demo event generated."
else
  rm -f static/demo-event.json
fi

echo "Starting solver..."
docker run -d --name seating-solver --network seating seating-solver

echo "Starting UI (takes ~20s to bundle)..."
docker run -d --name seating-ui --network seating seating-ui

echo "Starting nginx..."
docker run -d --name seating-nginx --network seating \
  -p 80:80 \
  -v "$(pwd)/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$(pwd)/static:/static:ro" \
  nginx:alpine

echo "Waiting for Expo to bundle..."
for i in $(seq 1 30); do
  if wget -qO /dev/null http://localhost 2>/dev/null; then
    echo ""
    echo "=== Ready at http://localhost ==="
    [ "$DEBUG" = true ] && echo "Debug mode: large demo event loaded"
    echo "Stop with: ./stop.sh"
    exit 0
  fi
  printf "."
  sleep 2
done
echo ""
echo "Warning: App may still be starting. Check: docker logs seating-ui"
