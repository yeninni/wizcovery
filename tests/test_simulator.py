import json
import sys
import threading
import unittest
from datetime import datetime
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from simulator import KST, parse_time, snapshot
from server import Handler


def at(value):
    return datetime.fromisoformat(value).replace(tzinfo=KST)


class SimulationTests(unittest.TestCase):
    def test_timezone_equivalence_and_fixed_replay(self):
        local = parse_time('2026-11-14T12:30:00+09:00')
        utc = parse_time('2026-11-14T03:30:00Z')
        self.assertEqual(snapshot(local), snapshot(utc))
        self.assertEqual(snapshot(local), snapshot(local))
        self.assertEqual(parse_time('2026-11-14T12:30').tzinfo, KST)

    def test_weekday_and_pre_game_demand(self):
        monday = snapshot(at('2026-11-09T13:00'))
        weekday = snapshot(at('2026-11-10T17:25'))
        weekend = snapshot(at('2026-11-14T12:55'))
        self.assertFalse(monday['schedule']['game_day'])
        self.assertGreater(weekday['store']['visitors'], monday['store']['visitors'])
        self.assertGreater(weekend['store']['visitors'], weekday['store']['visitors'])
        self.assertGreater(snapshot(at('2026-11-10T17:25'), scenario='busy')['store']['visitors'], weekday['store']['visitors'])

    def test_inventory_never_goes_negative_or_changes_due_to_polling(self):
        prev = None
        for hour in range(0, 24):
            data = snapshot(at(f'2026-11-14T{hour:02}:00'))
            stocks = [v['on_hand'] for p in data['inventory'] for v in p['variants']]
            self.assertTrue(all(x >= 0 for x in stocks))
            if prev is not None:
                self.assertTrue(all(x <= old for x, old in zip(stocks, prev)))
            prev = stocks
        self.assertEqual(snapshot(at('2026-11-14T12:00')), snapshot(at('2026-11-14T12:00')))

    def test_closed_store_does_not_destroy_on_hand_inventory(self):
        data = snapshot(at('2026-11-14T09:00'))
        self.assertFalse(data['store']['open'])
        self.assertEqual(data['store']['checkout_wait_minutes'], 0)
        self.assertTrue(any(v['on_hand'] > 0 for p in data['inventory'] for v in p['variants']))
        self.assertTrue(all(v['available'] == 0 for p in data['inventory'] for v in p['variants']))
        self.assertTrue(all(not s['available'] for s in data['pickup']['slots']))

    def test_marking_closes_at_exact_boundary(self):
        self.assertTrue(snapshot(at('2026-11-10T17:29:55'))['marking']['accepting'])
        m = snapshot(at('2026-11-10T17:30'))['marking']
        self.assertFalse(m['accepting'])
        self.assertIsNone(m['total_min'])
        self.assertEqual(m['location'], '매장 밖 외부 마킹 공간')
        before = snapshot(at('2026-11-10T16:30'))['marking']
        self.assertEqual(before['total_min'], before['wait_min'] + before['processing_min'])

    def test_slots_respect_lead_time_cutoff_and_capacity(self):
        data = snapshot(at('2026-11-10T16:00'))
        self.assertTrue(any(s['available'] for s in data['pickup']['slots']))
        for slot in data['pickup']['slots']:
            self.assertLessEqual(datetime.fromisoformat(slot['end']).hour, 18)
            if slot['available']:
                self.assertGreaterEqual(datetime.fromisoformat(slot['start']), at('2026-11-10T16:30'))
                self.assertGreater(slot['remaining'], 0)
                self.assertLessEqual(slot['remaining'], slot['capacity'])

    def test_soldout_and_restock_are_explicit_scenarios(self):
        sold = snapshot(at('2026-11-10T12:00'), scenario='soldout')
        self.assertTrue(all(v['on_hand'] == 0 for p in sold['inventory'] if p['id'] in (1, 2, 8) for v in p['variants'] if v['size'] == '95'))
        before = snapshot(at('2026-11-10T15:59:55'), scenario='restock')
        after = snapshot(at('2026-11-10T16:00'), scenario='restock')
        b = [v['on_hand'] for p in before['inventory'] for v in p['variants']]
        a = [v['on_hand'] for p in after['inventory'] for v in p['variants']]
        self.assertTrue(all(x > y for x, y in zip(a, b)))
        self.assertTrue(all(v['replenished'] == 30 for p in after['inventory'] for v in p['variants']))

    def test_daily_seed_and_bad_inputs(self):
        a = snapshot(at('2026-11-10T10:00'), seed=1)
        b = snapshot(at('2026-11-10T10:00'), seed=2)
        self.assertNotEqual(a['inventory'], b['inventory'])
        self.assertTrue(a['meta']['synthetic'])
        for args in [{'seed': -1}, {'scenario': 'bogus'}]:
            with self.assertRaises(ValueError):
                snapshot(**args)
        with self.assertRaises(ValueError):
            parse_time('not-a-date')


class HttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Handler.allowed_origin = 'https://yeninni.github.io'
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f'http://127.0.0.1:{cls.server.server_port}'

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def test_real_http_contract_and_static_files(self):
        for path in ['/api/v1/health', '/api/v1/snapshot', '/api/v1/inventory', '/api/v1/store', '/api/v1/zones', '/api/v1/marking', '/api/v1/pickup']:
            with urlopen(self.base + path + '?at=2026-11-14T12:30') as r:
                self.assertEqual(r.status, 200)
                self.assertTrue(json.load(r)['meta']['synthetic'])
                self.assertEqual(r.headers['Cache-Control'], 'no-store')
        for path in ['/simulator', '/simulator-dashboard.js', '/catalog.js', '/assets/fonts/Pretendard-Black.otf']:
            with urlopen(self.base + path) as r:
                self.assertGreater(len(r.read()), 100)

    def test_bad_api_input_and_private_files_are_blocked(self):
        for path, code in [('/api/v1/snapshot?seed=no',400),('/api/v1/snapshot?at=oops',400),('/api/v1/snapshot?scenario=oops',400),('/api/v1/snapshot?seed=1&seed=2',400),('/api/v1/snapshot?other=1',400),('/api/v1/missing',404),('/backend/settings.json',404),('/.git/config',404),('/%2e%2e/catalog.js',404)]:
            with self.assertRaises(HTTPError) as cm:
                urlopen(self.base + path)
            self.assertEqual(cm.exception.code, code)

    def test_cors_is_exact_and_opt_in(self):
        for origin, expected in [('https://yeninni.github.io','https://yeninni.github.io'), ('https://other.example', None)]:
            with urlopen(Request(self.base + '/api/v1/health', headers={'Origin':origin})) as r:
                self.assertEqual(r.headers.get('Access-Control-Allow-Origin'),expected)


if __name__ == '__main__':
    unittest.main()
