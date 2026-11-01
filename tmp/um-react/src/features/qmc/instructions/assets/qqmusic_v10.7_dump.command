#!/usr/bin/env python3

# QQMusic Mac MMKV Decryptor by LSR@Unlock Music

import hashlib
import re
import sys
from argparse import ArgumentParser
from dataclasses import dataclass
from os import PathLike
from os.path import dirname
from pathlib import Path
from struct import pack, unpack


@dataclass
class MMKVDecryptionData:
    udid: str
    mmkv_path: Path
    mmkv_key: str
    data: bytes

    @property
    def mmkv_name(self) -> str:
        return self.mmkv_path.name


def _aes_128_cfb_decrypt(key: bytes, iv: bytes, ciphertext: bytes) -> bytes:
    """Decrypt using `Crypto.Cipher.AES` _or_ fallback to `OpenSSL` otherwise"""
    try:
        from Crypto.Cipher import AES  # pyright: ignore[reportMissingImports]

        aes = AES.new(key[:16], AES.MODE_CFB, iv=iv, segment_size=128)
        return aes.decrypt(ciphertext)
    except ImportError:
        from subprocess import PIPE, Popen

        process = Popen(
            ["openssl", "enc", "-aes-128-cfb", "-d", "-K", key.hex(), "-iv", iv.hex()],
            stdin=PIPE,
            stdout=PIPE,
            stderr=PIPE,
            text=False,
        )
        stdout, stderr = process.communicate(input=ciphertext)
        if process.returncode != 0:
            raise RuntimeError(
                f"OpenSSL error (install PyCryptodome instead): {stderr.decode()}"
            )
        return stdout


def _caesar(text: str, shift: int) -> str:
    """A simple Caesar cipher implementation for alphanumeric characters"""
    result = ""
    for char in text:
        if char.isalpha():
            base = ord("A") if char.isupper() else ord("a")
            result += chr((ord(char) - base + shift) % 26 + base)
        elif char.isdigit():
            result += chr((ord(char) - ord("0") + shift) % 10 + ord("0"))
        else:
            result += char
    return result


__MMKV_TYPE_STREAM_KEY = 1


def _derive_mmkv_config(udid: str, mmkv_type: int):
    """Derive MMKV name and key from UDID, return (name, key)"""
    str1 = _caesar(udid, mmkv_type + 3)
    int1 = int(udid[5:7], 16)
    int2 = 5 + (int1 + mmkv_type) % 4
    mmkv_name = str1[0:int2]

    int3 = mmkv_type + 0xA546
    str3 = f"{udid}{int3:04x}"
    mmkv_key = hashlib.md5(str3.encode()).hexdigest()

    return mmkv_name, mmkv_key


def _decrypt_mmkv(path: PathLike, key: bytes):
    """Decrypt MMKV file using the given key, return decrypted data"""
    with open(path, "rb") as mmkv, open(str(path) + ".crc", "rb") as crc:
        crc.seek(12)
        iv = crc.read(16)
        (real_size,) = unpack("<I", crc.read(4))
        (mmkv_payload_size,) = unpack("<I", mmkv.read(4))

        if mmkv_payload_size != real_size:
            raise ValueError("MMKV file size mismatch")
        decrypted_data = pack("<I", real_size)
        decrypted_data += _aes_128_cfb_decrypt(key, iv, mmkv.read(real_size))
    return decrypted_data


def _dump_udid(plist_file: PathLike):
    """Extract UDIDs from the given plist file"""
    with open(plist_file, "rb") as f:
        plist = f.read()
    for m in re.finditer(rb"_\x10\(([0-9a-f]{40})_", plist):
        yield m.group(1).decode()


def _dump_mmkv(plist_file: PathLike, data_dir: PathLike):
    """Dump all MMKV files from the given plist file and iData directory"""
    for udid in _dump_udid(plist_file):
        mmkv_name, mmkv_key = _derive_mmkv_config(udid, __MMKV_TYPE_STREAM_KEY)
        mmkv_path = Path(data_dir) / mmkv_name

        if not mmkv_path.exists() or not mmkv_path.is_file():
            print(f"MMKV file not found, skipping (path={mmkv_path})", file=sys.stderr)
            continue

        try:
            decrypted_mmkv = _decrypt_mmkv(mmkv_path, mmkv_key.encode())
        except Exception as e:
            print(
                "Error decrypting mmkv, skipping"
                f" (path={mmkv_path}, key={mmkv_key}, error={e})",
                file=sys.stderr,
            )
            continue
        yield MMKVDecryptionData(
            udid=udid,
            mmkv_path=mmkv_path,
            mmkv_key=mmkv_key,
            data=decrypted_mmkv,
        )


def main():
    parser = ArgumentParser(
        description="QQMusic Mac MMKV Decryptor by LSR@Unlock Music"
    )
    parser.add_argument(
        "-p",
        "--plist",
        type=str,
        nargs="+",
        help="Path to com.tencent.QQMusicMac.plist file or files",
        default=[],
    )
    parser.add_argument(
        "-i",
        "--idata",
        type=str,
        help="Path to iData directory",
        default="",
    )
    parser.add_argument("-f", "--force", action="store_true", help="Force overwrite")
    parser.add_argument(
        "-o",
        "--output",
        type=str,
        help="Output directory for decrypted MMKV files (default: script directory)",
        default=dirname(__file__),
    )
    parser.add_argument(
        "-v", "--verbose", action="store_true", help="Enable verbose output"
    )
    args = parser.parse_args()

    home_dir = Path.home()
    app_sandbox_dir = home_dir / "Library/Containers/com.tencent.QQMusicMac/Data"
    idata_dir = app_sandbox_dir / "Library/Application Support/QQMusicMac/iData"

    if args.idata:
        idata_dir = Path(args.idata)

    plists = []
    if args.plist:
        plists = [Path(p) for p in args.plist]
    else:
        for base_dir in (home_dir, app_sandbox_dir):
            plists.append(base_dir / "Library/Preferences/com.tencent.QQMusicMac.plist")

    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    force = args.force
    verbose = args.verbose

    for plist_file in plists:
        if plist_file.exists() and plist_file.is_file():
            for dump in _dump_mmkv(plist_file, idata_dir):
                out_path = output_dir / f"qqmusic-mac-{dump.mmkv_path.name}.mmkv"
                if out_path.exists() and not force:
                    print(f"output exists, skipping (name={out_path.name})")
                    continue

                if verbose:
                    print("*** MMKV DUMP ENTRY START ***")
                    print(f"UDID:      {dump.udid}")
                    print(f"MMKV Name: {dump.mmkv_path.name}")
                    print(f"MMKV Key:  {dump.mmkv_key}")
                    print(f"Output:    {out_path.name}")
                    print("**** MMKV DUMP ENTRY END ****")
                else:
                    print(f"Dumping mmkv: {out_path.name}...")

                try:
                    with open(out_path, "wb") as f:
                        f.write(dump.data)
                except Exception as e:
                    print(f"Error writing decrypted mmkv: {e}", file=sys.stderr)
                    continue


if __name__ == "__main__":
    main()
