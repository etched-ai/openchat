#!/usr/env/bin bash

docker run \
    -it -d -p 8080:80 --name srh \
    -e SRH_MODE=env \
    -e SRH_TOKEN=your_token_here \
    -e SRH_CONNECTION_STRING="redis://your_server_here:6379" \
    hiett/serverless-redis-http:latest
