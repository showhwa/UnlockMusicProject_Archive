FROM debian:trixie-slim AS toolchain
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       gcc libc6-dev gcc-mingw-w64-x86-64 binutils-mingw-w64-x86-64 \
       meson ninja-build ca-certificates patch xxd git-core \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /src

FROM toolchain AS build
ARG COMMIT=dev
COPY . .
RUN meson setup build-win --cross-file toolchains/mingw-w64.ini \
       -Dbuildtype=release -Doptimization=2 -Db_lto=true \
       -Dstrip=true -Dwerror=true -Ddefault_library=static \
       -Dcommit="$COMMIT" \
    && meson compile -C build-win \
    && mkdir /out \
    && cp build-win/qmpc-mmkv-cli/qmpc-mmkv-cli.exe build-win/qmpc-mmkv-gui/qmpc-mmkv-gui.exe /out/

FROM scratch AS artifacts
COPY --from=build /out/ /
