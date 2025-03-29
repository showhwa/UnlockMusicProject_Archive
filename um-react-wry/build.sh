#!/bin/sh

docker build -t wry-builder .
docker run --rm wry-builder | base64 -d >um-react-wry-builder-linux-amd64.gz
