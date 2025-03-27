import os
import re
import time

import requests

# https://git.unlock-music.dev/um/lib_um_crypto_rust/archive/main.tar.gz
# https://git.unlock-music.dev/um/cli/archive/main.tar.gz
# https://git.unlock-music.dev/um/testsuite/archive/master.tar.gz

# /um/kgg-dec/stars

response = requests.get("https://git.unlock-music.dev/um")
projects = re.findall(r"/um/(.*?)/stars", response.text)

for project in projects:
    url = f"https://git.unlock-music.dev/um/{project}/archive/main.tar.gz"
    time.sleep(3)
    print(project)
    code = requests.head(url).status_code
    if code == 404:
        url = f"https://git.unlock-music.dev/um/{project}/archive/master.tar.gz"
        code = requests.head(url).status_code

    if code == 404:
        print(project + "404\n")
        with open("error_log.txt", "a", encoding="utf-8") as file:
            file.write(f"{project}: 404\n")
    else:
        pass
        # if not os.path.isdir("code"):
        #     os.mkdir("code")
        # download = requests.get(url)
        # download.raise_for_status()
        # with open(f"code/{project}.tar.gz", 'wb') as file:
        #     file.write(download.content)
        # print(f"{project}已下载到当前目录: code/{project}.tar.gz")