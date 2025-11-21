# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [v0.2.18] - 2025-11-16

### Changed
- QMC2: Fix `musicex\0` tag parsing.
- MMKV: Improved tolerance for corrupted MMKV file parsing.
- Updated project dependencies.

## [v0.2.17] - 2025-09-09 ⚠️ **(Broken Release)**

### Changed
- Update RegEx used to extract UDID in plist.

## [v0.2.16] - 2025-09-09 ⚠️ **(Broken Release)**

### Changed
- Update RegEx used to extract UDID in plist.

## [v0.2.15] - 2025-09-09 ⚠️ **(Broken Release)**

### Added
- Support MMKV dump in QQMusic Mac 10.x (AppStore version).

## [v0.2.14] - 2025-09-08 ⚠️ **(Broken Release)**

### Added
- Support MMKV dump in QQMusic Mac 10.x.

## [v0.2.13] - 2025-09-06 ⚠️ **(Broken Release)**

### Changed
- Updated project namespace and repository URLs to new url
- Upgraded Go version requirement to 1.25
- Restricted KGG database support to Windows platform only
- Enhanced MMKV key extraction logic with improved reliability

### Fixed
- Fixed NCM metadata parsing to properly handle mixed-type artist arrays
- Drop i386 targets in CI build

## [v0.2.12] - 2025-05-07

### Added
- KGG (KGMv5) file format support
- Support for `.mflacm` file extension

### Changed
- Updated default version identifier to "custom" for development builds
- Upgraded GoLang version

## [v0.2.11] - 2024-11-05

### Fixed
- Resolved relative path resolution issues on Windows platforms (#108)
- Improved cross-platform compatibility for file path handling

---

## Historical Versions

**Note**: This changelog was created starting from v0.2.11. For changes in earlier versions (v0.2.10 and below), please refer to the project's git commit history:

```bash
git log --oneline --before="2024-11-05"
```

Or view the complete commit history on the project repository for detailed information about features, fixes, and improvements in previous releases.
