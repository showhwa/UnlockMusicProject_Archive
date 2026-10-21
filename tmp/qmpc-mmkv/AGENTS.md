# Agent brief

## Map

| path | role |
|------|------|
| `libqmpc/` | shared lib; public API `include/`, impl `src/` |
| `qmpc-mmkv-cli/` | CLI; links `libqmpc_dep` |
| `qmpc-mmkv-gui/` | Win32 GUI; Meson `subdir` only if `host_machine.system()=='windows'` |
| `subprojects/*.wrap` | STC, tiny-AES-c, md5-c |
| `toolchains/mingw-w64.ini` | Debian/Arch MinGW cross; override via gitignored `local.ini` |
| `Dockerfile` | Debian cross-build → CLI+GUI EXE |
| `.gitea/workflows/build.yaml` | CI on `ubuntu-latest`: apt+meson test & MinGW cross; artifact = CLI |

Platform split: WinAPI in `*_win.c` / `hwid_win/`; else `*_other.c`. HWID real on Windows; Linux stub.

## Stack

C23 · Meson ≥1.3 · target Win x64 / MinGW-w64 · `default_library` (default `static`) · unit tests only when static.

## Invariants

- Headers: `#pragma once` only (no include-guard macros).
- Text UTF-8; GUI convert to UTF-16 for Win32 `*W`; `.rc` codepage 65001.
- GUI layout in `qmpc-mmkv-gui/src/app.rc`; IDs in `resource.h`; `app.manifest` Per-Monitor V2 (fallback System DPI).
- Do not commit build artifacts (`build*`, `dist/`).
- Human build/run/deps → `README.md` only. Do not dump long how-tos into agent files.

## Docs (ownership)

| file | who | what |
|------|-----|------|
| `AGENTS.md` | agent always-on | map, invariants, verify |
| `.cursor/rules/*.mdc` | agent scoped | area conventions |
| `README.md` | human | build, run, deps |
| `libqmpc/src/hwid_win/**/README.md` | both | provenance / attribution |

## Verify

```sh
# Windows native
meson setup build -Dwerror=true && meson compile -C build && meson test -C build --print-errorlogs

# Linux → Win cross (no auto Win tests; GUI needs Win or Wine)
meson setup build-win --cross-file toolchains/mingw-w64.ini -Dwerror=true && meson compile -C build-win

# Full artifact export
docker build --output type=local,dest=dist .
```
