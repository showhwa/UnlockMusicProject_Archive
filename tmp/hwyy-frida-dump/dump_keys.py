# com.huawei.music v12.11.37.310 audio key dump by LSR <https://git.unlock-music.dev/lsr>
# License: MIT

import csv
import frida

PKG_NAME = "com.huawei.music"

device = frida.get_usb_device()
proc_name = next((app.name for app in device.enumerate_applications() if app.identifier == PKG_NAME), None)

if not proc_name:
    print(f"package not found: {PKG_NAME}")
    exit(1)

print(f"process found: {proc_name}")
process = device.attach(proc_name)

with open(f"{PKG_NAME}.js") as f:
    js_code = f.read()

script = process.create_script(js_code, runtime="v8")
script.load()

keys = script.exports_sync.dump_audio_keys()

with open(f"{PKG_NAME}_keys.csv", "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.DictWriter(f, fieldnames=keys[0].keys() if keys else [])
    writer.writeheader()
    writer.writerows(keys)
