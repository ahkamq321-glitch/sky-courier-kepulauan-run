"""Take the entry screenshots: serve game/ on localhost (Firefox blocks ES modules
from file://), open each ?shot= scene from shots.json in Camoufox (Firefox)
headless, wait for window.__shotReady, save PNG.
Usage: python take_shots.py [shots.json path] [game dir] [out dir]
"""
import json
import os
import socket
import subprocess
import sys
import time
import urllib.request
from urllib.parse import urlparse

from camoufox.sync_api import Camoufox

GAME_DIR = os.path.abspath(sys.argv[2] if len(sys.argv) > 2 else "game")
SHOTS_JSON = sys.argv[1] if len(sys.argv) > 1 else "shots.json"
OUT_DIR = os.path.abspath(sys.argv[3] if len(sys.argv) > 3 else "screenshots")

with open(SHOTS_JSON) as f:
    shots = json.load(f)

proxy_url = os.environ.get("https_proxy") or os.environ.get("http_proxy") or ""
pu = urlparse(proxy_url)
proxy = None
if pu.hostname:
    proxy = {"server": f"http://{pu.hostname}:{pu.port}", "bypass": "127.0.0.1,localhost"}
    if pu.username:
        proxy["username"] = pu.username
    if pu.password:
        proxy["password"] = pu.password

os.makedirs(OUT_DIR, exist_ok=True)

# A static server on localhost: the game is a plain static site, and the grader
# serves it the same way. No proxy for localhost.
sock = socket.socket()
sock.bind(("127.0.0.1", 0))
port = sock.getsockname()[1]
sock.close()
server = subprocess.Popen(
    [sys.executable, "-m", "http.server", str(port), "--directory", GAME_DIR],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
)
try:
    for _ in range(50):
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{port}/index.html", timeout=2)
            break
        except Exception:
            time.sleep(0.1)
    with Camoufox(headless=True, proxy=proxy, canvas_noise=False) as browser:
        context = browser.new_context(
            viewport={"width": 1280, "height": 720}, ignore_https_errors=True,
        )
        page = context.new_page()
        page.on("pageerror", lambda e: print(f"  PAGEERROR: {e}", flush=True))
        for shot in shots:
            url = f"http://127.0.0.1:{port}/index.html{shot['query']}"
            print(f"--- {shot['name']} <- {url}", flush=True)
            page.goto(url, timeout=120000)
            try:
                page.wait_for_function(
                    "document.documentElement.getAttribute('data-shot-ready') === 'true'",
                    timeout=120000,
                )
            except Exception as e:
                print(f"  !! __shotReady never set: {e}", flush=True)
                print("  page text:", page.inner_text("body")[:400].replace("\n", " | "), flush=True)
                continue
            out = os.path.join(OUT_DIR, shot["name"])
            page.screenshot(path=out)
            print(f"  saved {out} ({os.path.getsize(out)} bytes)", flush=True)
        context.close()
finally:
    server.terminate()
print("DONE")
