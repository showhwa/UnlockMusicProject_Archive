# syntax=docker/dockerfile:1

# ---------- 生成 frontend/bindings（不入库）----------
FROM golang:1.26-bookworm AS bindings
WORKDIR /src
ENV PATH="/go/bin:${PATH}"
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      pkg-config \
      libgtk-4-dev \
      libwebkitgtk-6.0-dev \
 && rm -rf /var/lib/apt/lists/*
RUN go install github.com/wailsapp/wails/v3/cmd/wails3@v3.1.0
COPY go.mod go.sum ./
RUN go mod download
COPY main.go ./
COPY app/ ./app/
RUN mkdir -p frontend \
 && wails3 generate bindings -clean=true -time-type=Date -ts ./...
COPY containers/windows.manifest ./containers/
RUN wails3 generate syso -arch amd64 -icon app/assets/icon.ico \
      -manifest containers/windows.manifest -out wails_windows_amd64.syso

# ---------- 前端 ----------
FROM node:22-bookworm AS frontend
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY app/assets/icon.svg ../app/assets/icon.svg
COPY frontend/ ./
COPY --from=bindings /src/frontend/bindings ./bindings
RUN npm run build

# ---------- Go / Windows ----------
FROM golang:1.26-bookworm AS build
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
COPY --from=frontend /src/frontend/dist ./frontend/dist
COPY --from=bindings /src/wails_windows_amd64.syso ./

ARG APP_VERSION=v0.0.0
ARG APP_COMMIT=custom
RUN mkdir -p /dist \
 && CGO_ENABLED=0 GOOS=windows GOARCH=amd64 \
    go build \
      -tags production \
      -trimpath \
      -buildvcs=false \
      -ldflags="-w -s -H windowsgui -X main.AppVersion=${APP_VERSION} -X main.AppCommit=${APP_COMMIT}" \
      -o /dist/um-conv-windows-amd64.exe \
      .

# ---------- 导出层 ----------
FROM scratch AS artifacts
COPY --from=build /dist/ /
