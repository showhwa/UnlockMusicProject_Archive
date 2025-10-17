# Unlock Music Project - CLI Edition

Original: Web Edition https://git.um-react.app/um/web

- [![Build Status](https://git.um-react.app/um/cli/actions/workflows/build.yml/badge.svg)](https://git.um-react.app/um/cli/actions?workflow=build.yml)
- [Release Download](https://git.um-react.app/um/cli/releases/latest)
- [Latest Build](https://git.um-react.app/um/cli/actions)

> **WARNING**
> 在本站 fork 不会起到备份的作用，只会浪费服务器储存空间。如无必要请勿 fork 该仓库。

## Features

- [x] All Algorithm Supported By `unlock-music/web`
- [x] Complete Metadata & Cover Image

## Release

[Latest release](https://git.um-react.app/um/cli/releases/latest).

## Install from source

- Requirements: **Golang 1.23.3**

1. run `go install git.um-react.app/um/cli/cmd/um@main`

### Build from repo source

1. Pull repo source.
2. Build with `go build ./cmd/um`.

It will produce `um` or `um.exe` (Windows).

## How to use

- Drag the encrypted file to `um.exe` (Tested on Windows)
- Run: `./um [-o <output dir>] [-i] <input dir/file>`
- Use `./um -h` to show help menu
