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
projects.remove['testsuite']
for project in projects:
    if project:
        repo = f"{domain}/um/{project}.git"
        time.sleep(3)
        if not os.path.isdir("code"):
            os.mkdir("code")
        if not os.path.isdir(f"code/{formatted_date}/"):
            os.mkdir(f"code/{formatted_date}/")

        if session.head(repo).status_code == 200:
            os.system(f'git clone {repo} {project}')
            os.system(f"find . -type f -exec sed -i 's|{domain}|https://git\.unlock-music\.dev|g' {{}} \;")
            os.system(f'tar czf code/{formatted_date}/{project}.tar.gz {project}')
            os.system(f'rm -rf {project}/.git')
        else:
            error_log += f'{project}: 404\n'

if not error_log:
    if os.path.isfile("error_log.txt"):
        os.remove("error_log.txt")
else:
    with open("error_log.txt", "w", encoding="utf-8") as file:
        file.write(error_log)
