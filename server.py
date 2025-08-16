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

def main():
    """Start the HTTP server and optionally open the web browser."""
    # Configuration
    PORT = 8080
    HOST = 'localhost'
    
    # Change to the directory containing the web files
    web_dir = Path(__file__).parent
    if web_dir.exists():
        import os
        os.chdir(web_dir)
    
    # Create and configure the server
    with socketserver.TCPServer((HOST, PORT), CORSHTTPRequestHandler) as httpd:
        print(f"Decibel Meter Web Server")
        print(f"Serving at http://{HOST}:{PORT}")
        print(f"Directory: {Path.cwd()}")
        print()
        print("Make sure Room EQ Wizard is running with API enabled:")
        print("  Windows: roomeqwizard.exe -api")
        print("  macOS:   open -a REW.app --args -api")
        print()
        print("Press Ctrl+C to stop the server")
        print("-" * 50)
        
        # Optionally open the browser
        if len(sys.argv) > 1 and sys.argv[1] == '--browser':
            webbrowser.open(f'http://{HOST}:{PORT}')
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")

if __name__ == '__main__':
    main()
