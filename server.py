#!/usr/bin/env python3
"""Local web and demo API server for Acro dB Meter."""

import argparse
import functools
import http.server
import json
import random
import threading
import webbrowser
from pathlib import Path

HOST = "127.0.0.1"
DEFAULT_WEB_PORT = 8080
DEFAULT_REW_PORT = 4735
ALLOWED_DEMO_ORIGINS = {
    f"http://127.0.0.1:{DEFAULT_WEB_PORT}",
    f"http://localhost:{DEFAULT_WEB_PORT}",
}


class ReusableThreadingHTTPServer(http.server.ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True


class WebRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Serve only the application directory with defensive browser headers."""

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; img-src 'self' data:; style-src 'self'; "
            "script-src 'self'; connect-src http://127.0.0.1:* http://localhost:*; "
            "object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        )
        super().end_headers()


class RewDemoHandler(http.server.BaseHTTPRequestHandler):
    """Implement only the small REW API subset used by the app."""

    server_version = "AcroRewDemo/1.0"

    def _add_cors_headers(self):
        origin = self.headers.get("Origin")
        if origin in ALLOWED_DEMO_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Accept")

    def _send_json(self, status, payload):
        encoded = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(encoded)))
        self._add_cors_headers()
        self.end_headers()
        self.wfile.write(encoded)

    def do_OPTIONS(self):
        self.send_response(204)
        self._add_cors_headers()
        self.end_headers()

    def do_GET(self):
        if self.path == "/spl-meter/1/levels":
            self._send_json(200, {"spl": round(80 + random.uniform(0, 4), 1)})
        elif self.path == "/spl-meter/commands":
            self._send_json(200, {"commands": ["Start", "Stop"]})
        else:
            self._send_json(404, {"error": "Not found"})

    def do_PUT(self):
        if self.path == "/spl-meter/1/configuration":
            self._send_json(200, {"message": "Configured"})
        else:
            self._send_json(404, {"error": "Not found"})

    def do_POST(self):
        if self.path == "/spl-meter/1/command":
            self._send_json(200, {"message": "OK"})
        else:
            self._send_json(404, {"error": "Not found"})

    def log_message(self, format_string, *args):
        return


def run_demo_server(port):
    with ReusableThreadingHTTPServer((HOST, port), RewDemoHandler) as server:
        print(f"Demo REW API: http://{HOST}:{port}")
        server.serve_forever()


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--browser", action="store_true", help="open the app in the default browser")
    parser.add_argument("--demo", action="store_true", help="run a local mock REW API")
    parser.add_argument("--port", type=int, default=DEFAULT_WEB_PORT, help="web server port")
    return parser.parse_args()


def main():
    args = parse_args()
    web_directory = Path(__file__).resolve().parent

    if args.demo:
        demo_thread = threading.Thread(
            target=run_demo_server,
            args=(DEFAULT_REW_PORT,),
            daemon=True,
        )
        demo_thread.start()

    handler = functools.partial(WebRequestHandler, directory=str(web_directory))
    with ReusableThreadingHTTPServer((HOST, args.port), handler) as server:
        query = "?demo=true" if args.demo else ""
        app_url = f"http://{HOST}:{args.port}/{query}"
        print(f"Acro dB Meter: {app_url}")
        print("Press Ctrl+C to stop.")

        if args.browser:
            webbrowser.open(app_url)

        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down.")


if __name__ == "__main__":
    main()
