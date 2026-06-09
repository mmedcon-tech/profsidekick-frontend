
import os, subprocess

script = """
export GIT_COMMITTER_NAME="mmedcon-tech"
export GIT_COMMITTER_EMAIL="mmedcon.it@gmail.com"
export GIT_AUTHOR_NAME="mmedcon-tech"
export GIT_AUTHOR_EMAIL="mmedcon.it@gmail.com"
"""
with open("env.sh", "w") as f:
    f.write(script)

cmd = ["C:\\Program Files\\Git\\bin\\sh.exe", "-c", "git filter-branch -f --env-filter \"source \`pwd\`/env.sh\" --tag-name-filter cat -- --all"]
subprocess.run(cmd)

