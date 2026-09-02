#!/bin/bash
docker rm -f seating-solver seating-ui seating-nginx 2>/dev/null
docker network rm seating 2>/dev/null
echo "Stopped."
