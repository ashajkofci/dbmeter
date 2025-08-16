#!/usr/bin/env python3
"""
Simple HTTP server for the Decibel Meter web application.
This server handles CORS issues that may occur when accessing the REW API from a file:// URL.
"""

import http.server
import socketserver
import webbrowser
import sys
from pathlib import Path
import threading
import json

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP request handler with CORS headers to allow API calls to REW."""
    
    def end_headers(self):
        """Add CORS headers to all responses."""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Accept')
        super().end_headers()
    
    def do_OPTIONS(self):
        """Handle preflight OPTIONS requests."""
        self.send_response(200)
        self.end_headers()

def run_rew_demo_server(host, port):
    class REWDemoHandler(http.server.BaseHTTPRequestHandler):
        def end_headers(self):
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Accept')
            super().end_headers()

        def do_OPTIONS(self):
            self.send_response(200)
            self.end_headers()

        def do_GET(self):
            # Return fake data for /spl-meter/1/levels
            if self.path.startswith("/spl-meter/1/levels"):
                import random
                spl_value = 80 + random.uniform(0, 4)
                fake_data = {"spl": round(spl_value, 1)}
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(fake_data).encode())
            # Return dummy response for /spl-meter/commands
            elif self.path.startswith("/spl-meter/commands"):
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"commands": ["Start", "Stop"]}).encode())
            else:
                self.send_response(404)
                self.end_headers()

    with socketserver.TCPServer((host, port), REWDemoHandler) as rew_server:
        print(f"Demo REW API Server serving at http://{host}:{port}")
        try:
            rew_server.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down REW demo server...")

def main():
    """Start the HTTP server and optionally open the web browser."""
    # Configuration
    PORT = 8080
    HOST = 'localhost'
    REW_PORT = 4735

    demo_mode = '--demo' in sys.argv

    # Change to the directory containing the web files
    web_dir = Path(__file__).parent
    if web_dir.exists():
        import os
        os.chdir(web_dir)

    # Start REW demo server in a thread if demo mode
    if demo_mode:
        rew_thread = threading.Thread(target=run_rew_demo_server, args=(HOST, REW_PORT), daemon=True)
        rew_thread.start()

    # Create and configure the main server
    with socketserver.TCPServer((HOST, PORT), CORSHTTPRequestHandler) as httpd:
        print(f"Decibel Meter Web Server")
        print(f"Serving at http://{HOST}:{PORT}")
        print(f"Directory: {Path.cwd()}")
        if demo_mode:
            print(f"Demo mode enabled. REW API server at http://{HOST}:{REW_PORT}")
        print()
        print("Make sure Room EQ Wizard is running with API enabled:")
        print("  Windows: roomeqwizard.exe -api")
        print("  macOS:   open -a REW.app --args -api")
        print()
        print("Press Ctrl+C to stop the server")
        print("-" * 50)

        # Optionally open the browser
        if '--browser' in sys.argv:
            webbrowser.open(f'http://{HOST}:{PORT}')

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")

if __name__ == '__main__':
    main()
