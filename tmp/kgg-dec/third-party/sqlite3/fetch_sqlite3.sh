#!/bin/sh -ex

NAME="sqlite-amalgamation-3470200"

if ! sha256sum -c sqlite3.sha256sum; then
  rm -f sqlite3-*.zip
  curl -fsLO "https://www.sqlite.org/2024/$NAME.zip"
  sha256sum -c sqlite3.sha256sum || exit 1
fi

unzip -n "$NAME.zip"
