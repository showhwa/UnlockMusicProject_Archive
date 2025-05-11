#!/bin/bash -e
# see .gitea/workflows/build.yml

APP_VERSION="${1:-$(git describe --tags --always)}"

pack() {
    local is_windows=0
    local suffix=""
    if [[ "$1" == *.exe ]]; then
        suffix=".exe"
        is_windows=1
    fi

    local exe_dir="$(dirname "$1")"
    local archive_name="$(basename "$1" ".exe")-${APP_VERSION}"
    local exe_name="um${suffix}"

    echo "archiving ${exe_name}..."

    mv "$1" "${exe_name}"
    if [[ "$is_windows" == 1 ]]; then
        zip -Xqj9 "dist/${archive_name}.zip" "${exe_name}" README.md LICENSE
    else
        tar \
            --sort=name --format=posix \
            --pax-option=exthdr.name=%d/PaxHeaders/%f \
            --pax-option=delete=atime,delete=ctime \
            --clamp-mtime --mtime='1970-01-01T00:00:00Z' \
            --numeric-owner --owner=0 --group=0 \
            --mode=0755 -c \
            "${exe_name}" README.md LICENSE |
            gzip -9 >"dist/${archive_name}.tar.gz"
    fi
    rm -rf "$exe_dir" "${exe_name}"
}

for exe in prepare/*/um*; do
    pack "$exe"
done

pushd dist

if command -v strip-nondeterminism >/dev/null 2>&1; then
    echo 'strip archives...'
    strip-nondeterminism *.zip *.tar.gz
fi

echo 'Creating checksum...'
sha256sum *.zip *.tar.gz >sha256sum.txt
popd
