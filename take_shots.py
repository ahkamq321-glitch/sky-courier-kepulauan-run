# Render the 4 Karst Bay Courier screenshots (1280x720, JPEG <= 256 KiB) with Camoufox.
# WebGL only works in HEADED mode under Xvfb on this VM (headless exhausts the GL
# drivers), so run this script as:  xvfb-run -a <venv python> take_shots.py
# It waits a fixed 3s after load (no ready-flag wait — the flag is unreliable here).
import json, os, socket, subprocess, sys, time

os.environ.setdefault('LIBGL_ALWAYS_SOFTWARE', '1')
os.environ.setdefault('MOZ_DISABLE_GPU_SANDBOX', '1')
sys.path.insert(0, os.path.expanduser('~/workspace/tools/camoufox/venv/lib/python3.12/site-packages'))
from camoufox.sync_api import Camoufox

HERE = os.path.dirname(os.path.abspath(__file__))
GAME_DIR = os.path.join(HERE, 'game')
OUT_DIR = os.path.join(HERE, 'screenshots')
os.makedirs(OUT_DIR, exist_ok=True)

with open(os.path.join(HERE, 'shots.json')) as f:
    SHOTS = json.load(f)

s = socket.socket(); s.bind(('127.0.0.1', 0)); PORT = s.getsockname()[1]; s.close()
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'],
                       cwd=GAME_DIR, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
try:
    with Camoufox(headless=False, canvas_noise=False,
                  firefox_user_prefs={'webgl.force-enabled': True,
                                      'webgl.software-webgl': True,
                                      'layers.acceleration.disabled': True}) as browser:
        ctx = browser.new_context(viewport={'width': 1280, 'height': 720},
                                  proxy={'server': os.environ['https_proxy']},
                                  ignore_https_errors=True)
        page = ctx.new_page()
        page.on('pageerror', lambda e: print('PAGEERROR:', e))
        for shot in SHOTS:
            url = 'http://127.0.0.1:%d/index.html%s' % (PORT, shot['query'])
            page.goto(url)
            page.wait_for_timeout(3000)
            out = os.path.join(OUT_DIR, shot['name'])
            page.screenshot(path=out, type='jpeg', quality=85)
            size = os.path.getsize(out)
            status = 'OK' if 10000 < size <= 262144 else 'OVER' if size > 262144 else 'SMALL?'
            print('%s %s %d bytes %s' % (status, shot['name'], size, url))
finally:
    srv.terminate()
print('DONE')
