# com.huawei.music v12.11.37.310 audio decrypt script by LSR <https://git.unlock-music.dev/lsr>
# License: MIT
# Decrypt script based on the work of @yunluoa: https://git.unlock-music.dev/um/um-react/issues/48#issuecomment-2556

from Crypto.Cipher import AES
import base64
import argparse


def decrypt_file(in_path, out_path, key, iv):
    assert len(key) == 16, "AES key must be 16 bytes long"
    assert len(iv) == 16, "AES IV must be 16 bytes long"

    with open(out_path, "wb") as decrypted_file:
        with open(in_path, "rb") as encrypted_file:
            while data_in := encrypted_file.read(0x800):
                cipher = AES.new(key, AES.MODE_OFB, iv=iv)
                decrypted_file.write(cipher.decrypt(data_in))

    print(f"File decrypted: {out_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Decrypt huawei AES/OFB file")
    parser.add_argument("-i", "--input", type=str, help="encrypted file path", required=True)
    parser.add_argument("-o", "--output", type=str, help="decrypted file path", required=True)
    parser.add_argument("-k", "--key", type=str, help="AES key", required=True)
    parser.add_argument("-I", "--iv", type=str, help="AES IV", required=True)
    args = parser.parse_args()
    decrypt_file(args.input, args.output, base64.b64decode(args.key), base64.b64decode(args.iv))
