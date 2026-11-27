#!/usr/bin/env python3
"""Render the 4 Karst Bay Courier screenshots at 1280x720 with Camoufox.

Proven WebGL recipe: xvfb-run -a, headed browser (headless=False), canvas_noise=False,
LIBGL_ALWAYS_SOFTWARE=1, MOZ_DISABLE_GPU_SANDBOX=1, firefox_user_prefs
webgl.force-enabled + webgl.software-webgl. Pure headless FAILS (no GL driver).
Serves game/ over a local static server; waits a fixed 3s after load (no ready flag).
"""
import json
import os
import threading
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

REPO = os.path.dirname(os.path.abspath(__file__))
GAME_DIR = os.path.join(REPO, 'game')
SHOTS = os.path.join(REPO, 'screenshots')
PORT = 8931

SCENES = [
    ('01-chase.jpg', '?scene=chase'),
    ('02-cockpit.jpg', '?scene=cockpit'),
    ('03-missions.jpg', '?scene=missions'),
    ('04-night.jpg', '?scene=night'),
]

def serve():
    handler = partial(SimpleHTTPRequestHandler, directory=GAME_DIR)
    httpd = ThreadingHTTPServer(('127.0.0.1', PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd

def main():
    os.environ.setdefault('LIBGL_ALWAYS_SOFTWARE', '1')
    os.environ.setdefault('MOZ_DISABLE_GPU_SANDBOX', '1')
    os.makedirs(SHOTS, exist_ok=True)
    httpd = serve()
    from camoufox.sync_api import Camoufox
    proxy = os.environ.get('https_proxy') or os.environ.get('HTTPS_PROXY')
    ctx_kwargs = {'ignore_https_errors': True}
    if proxy:
        ctx_kwargs['proxy'] = {'server': proxy, 'bypass': 'localhost,127.0.0.1'}
    with Camoufox(
        headless=False,
        canvas_noise=False,
        firefox_user_prefs={'webgl.force-enabled': True, 'webgl.software-webgl': True},
    ) as browser:
        ctx = browser.new_context(viewport={'width': 1280, 'height': 720}, **ctx_kwargs)
        page = ctx.new_page()
        for name, query in SCENES:
            url = f'http://127.0.0.1:{PORT}/index.html{query}'
            page.goto(url)
            page.wait_for_timeout(3000)
            out = os.path.join(SHOTS, name)
            page.screenshot(path=out, type='jpeg', quality=85)
            size = os.path.getsize(out)
            print(f'{name}: {size} bytes', flush=True)
            assert size <= 262144, f'{name} over 256 KiB: {size}'
        ctx.close()
    httpd.shutdown()
    print('all 4 screenshots done', flush=True)

if __name__ == '__main__':
    main()
