"""Run: python3 backend/server.py --port 8000"""
from __future__ import annotations

import argparse
import json
import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

from simulator import SCENARIOS, parse_time, snapshot

SITE_ROOT = Path(__file__).resolve().parent.parent
STATIC_FILES = {'index.html', 'store-map.html', 'pickup.html', 'smart.html', 'simulator.html',
                'simulator-dashboard.js', 'catalog.js', 'ontology.js', 'smart.js',
                'experience.js', 'experience.css', 'typography.css', 'browser-simulator.js', 'live-demo.js', 'ui.css', 'ui.js'}


class Handler(BaseHTTPRequestHandler):
    server_version = 'WizSynthetic/1.0'
    allowed_origin = None

    def send_payload(self, status, data, content_type='application/json; charset=utf-8'):
        body = json.dumps(data, ensure_ascii=False, allow_nan=False).encode() if isinstance(data, dict) else data
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        if self.allowed_origin and self.headers.get('Origin') == self.allowed_origin:
            self.send_header('Access-Control-Allow-Origin', self.allowed_origin)
            self.send_header('Vary', 'Origin')
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(body)

    def error(self, status, message):
        self.send_payload(status, {'synthetic': True, 'error': message})

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        path = unquote(urlsplit(self.path).path)
        if path.startswith('/api/'):
            try:
                query = parse_qs(urlsplit(self.path).query, keep_blank_values=True)
                if set(query) - {'at', 'seed', 'scenario'} or any(len(v) != 1 for v in query.values()):
                    raise ValueError('지원하는 매개변수는 at, seed, scenario이며 각각 한 번만 지정할 수 있습니다.')
                at = parse_time(query.get('at', [None])[0])
                try:
                    seed = int(query.get('seed', ['42'])[0])
                except ValueError as exc:
                    raise ValueError('seed는 정수여야 합니다.') from exc
                scenario = query.get('scenario', ['normal'])[0]
                data = snapshot(at, seed, scenario)
                routes = {'/api/v1/inventory': 'inventory', '/api/v1/store': 'store',
                          '/api/v1/zones': 'zones', '/api/v1/marking': 'marking', '/api/v1/pickup': 'pickup'}
                if path == '/api/v1/snapshot':
                    self.send_payload(200, data)
                elif path == '/api/v1/health':
                    self.send_payload(200, {'meta': data['meta'], 'status': 'ok', 'scenarios': list(SCENARIOS)})
                elif path in routes:
                    self.send_payload(200, {'meta': data['meta'], 'data': data[routes[path]]})
                else:
                    self.error(404, '존재하지 않는 API입니다.')
            except (ValueError, OverflowError) as exc:
                self.error(400, str(exc))
            return
        name = 'index.html' if path == '/' else 'simulator.html' if path == '/simulator' else path.lstrip('/')
        file = (SITE_ROOT / name).resolve()
        if not file.is_relative_to(SITE_ROOT) or not (name in STATIC_FILES or (name.startswith('assets/') and file.suffix.lower() in {'.otf', '.woff', '.woff2', '.png', '.jpg', '.svg'})):
            self.error(404, '공개 파일이 아닙니다.')
            return
        if not file.is_file():
            self.error(404, '파일을 찾을 수 없습니다.')
            return
        self.send_payload(200, file.read_bytes(), mimetypes.guess_type(file.name)[0] or 'application/octet-stream')


def main():
    parser = argparse.ArgumentParser(description='WIZCOVERY 합성 데이터 서버 (실제 운영 데이터 아님)')
    parser.add_argument('--host', default='0.0.0.0')
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--allow-origin', help='선택: CORS를 허용할 정확한 프런트엔드 origin. 예: https://yeninni.github.io')
    args = parser.parse_args()
    if args.allow_origin:
        parts = urlsplit(args.allow_origin)
        if parts.scheme not in {'http', 'https'} or not parts.netloc or parts.path or parts.query or parts.fragment:
            parser.error('--allow-origin은 경로 없는 정확한 http(s) origin이어야 합니다.')
    Handler.allowed_origin = args.allow_origin
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f'Synthetic data server listening on port {args.port}; dashboard: /simulator', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
