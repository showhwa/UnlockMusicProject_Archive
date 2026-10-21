# Unlock Music Project - CLI Edition

Original: Web Edition https://git.um-react.app/um/web

- [![Build Status](https://git.um-react.app/um/cli/actions/workflows/build.yml/badge.svg)](https://git.um-react.app/um/cli/actions?workflow=build.yml)
- [Release Download](https://git.um-react.app/um/cli/releases/latest)
- [Latest Build](https://git.um-react.app/um/cli/actions)

> **WARNING**
> 在本站 fork 不会起到备份的作用，只会浪费服务器储存空间。如无必要请勿 fork 该仓库。

## Features

- Decrypt formats supported by `unlock-music/web` (NCM, QMC/MGG/MFLAC, KGM/KGG, KWM, XM, Ximalaya, TM, …)
- Optional network metadata & cover update via `--update-metadata` (requires `ffmpeg` / `ffprobe` on `PATH`)
- Directory watch mode (`--watch`), overwrite / remove-source helpers
- QMC ekey loaders: platform defaults (macOS / Windows), user MMKV, Android `player_process_db`
- KGG (KGMv5) on Windows via KuGou `KGMusicV3.db`

## Release

[Latest release](https://git.um-react.app/um/cli/releases/latest).

## Install from source

- Requirements: **Go 1.25+** (see `go.mod`)

```bash
go install git.um-react.app/um/cli/cmd/um@main
```

### Build from repo source

```bash
git clone https://git.um-react.app/um/cli.git
cd cli
go build -o um ./cmd/um
```

Produces `um` (or `um.exe` on Windows).

## How to use

```bash
# Single file or directory (default input = cwd, default output = input dir)
./um [-o <output dir>] [-i] <input dir/file>

# Common flags
./um -o ./out --overwrite ./encrypted/
./um --watch -o ./out ./inbox/                 # process existing + watch for new files
./um --update-metadata -o ./out song.mflac     # needs ffmpeg/ffprobe
./um --supported-ext                           # list registered extensions
./um -h
```

Drag-and-drop onto `um.exe` also works on Windows (passes the path as argv).

## Development

See [AGENTS.md](./AGENTS.md) for repository layout, how to add a decoder, and agent-oriented conventions.

## License

This project is licensed under the MIT License.  
See the [LICENSE](./LICENSE) file for details.
