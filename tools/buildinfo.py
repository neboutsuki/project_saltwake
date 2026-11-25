"""Build identity shared by build.py and tools/build_split.py."""
from pathlib import Path
import datetime, json, subprocess

ROOT = Path(__file__).resolve().parent.parent


def info():
    def git(*a):
        try:
            return subprocess.check_output(['git', *a], cwd=ROOT, stderr=subprocess.DEVNULL).decode().strip()
        except Exception:
            return ''
    version = (ROOT / 'VERSION').read_text().strip() if (ROOT / 'VERSION').exists() else '0.0.0'
    count = git('rev-list', '--count', 'HEAD') or '0'
    commit = git('rev-parse', '--short', 'HEAD') or 'local'
    dirty = bool(git('status', '--porcelain'))
    build = int(count) + (1 if dirty else 0)   # the build you make before committing is the next build number
    now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
    return {'version': version, 'build': build, 'commit': commit + ('+' if dirty else ''), 'date': now,
            'label': f'v{version} · build {build}'}


def script():
    return 'window.SALTWAKE_BUILD=' + json.dumps(info()) + ';'
