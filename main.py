import os
import re
import time

import requests
from datetime import datetime
from url import domain


# https://git.unlock-music.dev/um/lib_um_crypto_rust/archive/main.tar.gz
# https://git.unlock-music.dev/um/cli/archive/main.tar.gz
# https://git.unlock-music.dev/um/testsuite/archive/master.tar.gz

# /um/kgg-dec/stars


session = requests.Session()
# response = session.get("https://git.unlock-music.dev/um")
response = session.get(f"{domain}/um")
if response.status_code != 200:
    exit(1)
projects = re.findall(r"/um/(.*?)/stars", response.text)
current_date = datetime.now()
formatted_date = current_date.strftime('%Y%m%d')
error_log = ''

for project in projects:
    url = f"{domain}/um/{project}/archive/main.tar.gz"
    time.sleep(3)
    print(project)
    if not os.path.isdir("code"):
        os.mkdir("code")
    if not os.path.isdir(f"code/{formatted_date}/"):
        os.mkdir(f"code/{formatted_date}/")

    code = session.head(url).status_code
    if code == 404:
        url = f"{domain}/um/{project}/archive/master.tar.gz"
        code = session.head(url).status_code

    if code == 404:
        print(project + "404\n")
        error_log += f'{project}: 404\n'
    else:
        # pass
        download = session.get(url)
        download.raise_for_status()
        with open(f"code/{formatted_date}/{project}.tar.gz", 'wb') as file:
            file.write(download.content)
        print(f"{project}已下载到当前目录: code/{formatted_date}/{project}.tar.gz")

if not error_log:
    if os.path.isfile("error_log.txt"):
        os.remove("error_log.txt")
else:
    with open("error_log.txt", "w", encoding="utf-8") as file:
        file.write(error_log)
