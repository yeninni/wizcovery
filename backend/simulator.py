"""Clock-driven synthetic retail data. No real sales, bookings, or personal data.

Pure snapshots are deterministic for the same timestamp/seed/scenario and can
be requested out of order. Daily sales are calculated cumulatively, not by
subtracting stock each time someone polls the API.
"""
from __future__ import annotations

import hashlib
import json
import math
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent
SETTINGS = json.loads((ROOT / 'settings.json').read_text())
CATALOG = json.loads((ROOT / 'catalog.json').read_text())
KST = ZoneInfo(SETTINGS['timezone'])
SCENARIOS = ('normal', 'busy', 'soldout', 'restock')


def minute(hhmm: str) -> int:
    hour, mins = map(int, hhmm.split(':'))
    return hour * 60 + mins


def parse_time(raw: str | None) -> datetime:
    if not raw:
        return datetime.now(KST)
    try:
        value = datetime.fromisoformat(raw.replace('Z', '+00:00'))
    except ValueError as exc:
        raise ValueError('at은 ISO 8601 날짜·시간이어야 합니다. 예: 2026-11-14T13:00:00+09:00') from exc
    if value.tzinfo is None:
        value = value.replace(tzinfo=KST)
    return value.astimezone(KST)


def noise(key: str) -> float:
    return int.from_bytes(hashlib.sha256(key.encode()).digest()[:4], 'big') / (2**32 - 1)


def demand_at(t: float, game: int | None, weekday: int, scenario: str) -> float:
    baseline = 0.32
    if game is not None:
        # Arrival peak, mid-game dip, and post-game buying.
        baseline += 2.7 * math.exp(-((t - (game - 65)) / 60) ** 2)
        baseline += 0.45 * math.exp(-((t - (game + 65)) / 45) ** 2)
        baseline += 1.4 * math.exp(-((t - (game + 185)) / 50) ** 2)
    else:
        baseline += 0.4 * math.exp(-((t - 14 * 60) / 95) ** 2)
    return baseline * SETTINGS['weekday_demand'][weekday] * (1.7 if scenario == 'busy' else 1)


def snapshot(at: datetime | None = None, seed: int = 42, scenario: str = 'normal') -> dict:
    if scenario not in SCENARIOS:
        raise ValueError('scenario는 normal, busy, soldout, restock 중 하나입니다.')
    if not isinstance(seed, int) or not 0 <= seed <= 2**31 - 1:
        raise ValueError('seed는 0~2147483647 정수입니다.')
    now = at or datetime.now(KST)
    if now.tzinfo is None:
        now = now.replace(tzinfo=KST)
    now = now.astimezone(KST)
    now = now.replace(second=(now.second // SETTINGS['refresh_seconds']) * SETTINGS['refresh_seconds'], microsecond=0)
    date, weekday = now.date().isoformat(), now.weekday()
    t = now.hour * 60 + now.minute + now.second / 60
    opened, closed = minute(SETTINGS['opening']), minute(SETTINGS['closing'])
    is_open = opened <= t < closed
    game_text = SETTINGS['game_start_by_weekday'][str(weekday)]
    game = minute(game_text) if game_text else None
    # Integrate up to this timestamp. More polling never generates more sales.
    whole = max(opened, min(math.floor(t), closed))
    demand_integral = sum(demand_at(m + 0.5, game, weekday, scenario) for m in range(opened, whole))
    if opened <= t < closed:
        demand_integral += demand_at(t, game, weekday, scenario) * (t - math.floor(t))
    current_demand = demand_at(t, game, weekday, scenario) if is_open else 0
    occupancy = min(230, round(current_demand * 37)) if is_open else 0
    checkout_queue = max(0, round(occupancy * .16 - 2))
    checkout_wait = math.ceil(checkout_queue / 3)
    crowd = 'closed' if not is_open else 'high' if occupancy >= 100 else 'medium' if occupancy >= 45 else 'low'
    products = []
    for item in CATALOG:
        variants = []
        for size, original in item['sizes'].items():
            key = f'{seed}:{date}:{item["id"]}:{size}'
            initial = 0 if original == 0 else original + int(noise(key + ':initial') * 18)
            rate = .025 + .075 * noise(key + ':rate')
            cumulative_sales = math.floor(demand_integral * rate)
            on_hand = max(0, initial - cumulative_sales)
            replenished = 0
            if scenario == 'restock' and t >= minute(SETTINGS['restock_at']):
                # New stock starts selling only after the scheduled replenishment.
                arrival = minute(SETTINGS['restock_at'])
                post_integral = sum(demand_at(m + .5, game, weekday, scenario) for m in range(arrival, whole))
                if arrival <= t < closed:
                    post_integral += demand_at(t, game, weekday, scenario) * (t - math.floor(t))
                replenished = 30
                on_hand += max(0, replenished - math.floor(post_integral * rate))
            if scenario == 'soldout' and item['id'] in (1, 2, 8, 586, 587) and size == '95':
                on_hand = 0
            variants.append({'sku': f'{item["id"]}-{size}', 'size': size,
                             'opening_stock': initial, 'replenished': replenished,
                             'on_hand': on_hand, 'available': on_hand if is_open else 0,
                             'status': 'unavailable' if not is_open else 'sold_out' if on_hand == 0 else 'low_stock' if on_hand <= 4 else 'in_stock'})
        products.append({'id': item['id'], 'name': item['name'], 'category': item['category'],
                         'price': item['price'], 'zone': item.get('mapZone'),
                         'pickup_eligible': '마킹' not in item['name'], 'variants': variants})
    cutoff = min(closed - 30, game - SETTINGS['marking_cutoff_minutes_before_game']) if game else closed - 60
    accepting = is_open and t < cutoff
    marking_queue = max(0, math.floor(occupancy * .10)) if accepting else 0
    marking_wait = math.ceil(marking_queue / 2) * 5
    work_min, work_max = SETTINGS['marking_processing_min'], SETTINGS['marking_processing_max']
    marking = {'zone': 'marking-service', 'location': '매장 밖 외부 마킹 공간',
               'accepting': accepting, 'status': 'open' if accepting else 'closed',
               'cutoff_at': now.replace(hour=cutoff // 60, minute=cutoff % 60, second=0).isoformat(),
               'queue_people': marking_queue,
               'wait_min': marking_wait if accepting else None,
               'processing_min': work_min if accepting else None,
               'processing_max': work_max if accepting else None,
               'total_min': marking_wait + work_min if accepting else None,
               'total_max': marking_wait + work_max if accepting else None}
    pickup_end = min(closed, game - SETTINGS['pickup_cutoff_minutes_before_game']) if game else closed
    slots = []
    for start in range(opened, pickup_end, SETTINGS['pickup_slot_minutes']):
        end = min(start + SETTINGS['pickup_slot_minutes'], pickup_end)
        if end - start != SETTINGS['pickup_slot_minutes']:
            continue
        capacity = 8 + int(noise(f'{seed}:{date}:slot:{start}') * 9)
        load = round(demand_at(start, game, weekday, scenario) * 2.5)
        remaining = max(0, capacity - load)
        available = is_open and start >= t + SETTINGS['pickup_lead_minutes'] and remaining > 0
        slots.append({'start': now.replace(hour=start // 60, minute=start % 60, second=0).isoformat(),
                      'end': now.replace(hour=end // 60, minute=end % 60, second=0).isoformat(),
                      'capacity': capacity, 'remaining': remaining if available else 0,
                      'available': available,
                      'reason': 'available' if available else 'store_closed' if not is_open else 'lead_time_or_cutoff' if start < t + SETTINGS['pickup_lead_minutes'] else 'full'})
    zone_defs = [('uniform', '유니폼', .28), ('collab', '콜라보 제품', .20),
                 ('goods1', '굿즈 진열대 1', .10), ('goods2', '굿즈 진열대 2', .10), ('goods3', '굿즈 진열대 3', .10)]
    zones = [{'id': z, 'name': n, 'visitors': round(occupancy * share),
              'crowd': 'closed' if not is_open else 'high' if occupancy * share >= 25 else 'medium' if occupancy * share >= 12 else 'low'} for z, n, share in zone_defs]
    return {
        'meta': {'synthetic': True, 'source': 'WIZCOVERY_SIMULATOR', 'model_version': '1.0',
                 'notice': '요일·시간대 기반 합성 데이터입니다. 실제 경기 일정·매장 재고·운영 상태가 아닙니다.',
                 'timezone': SETTINGS['timezone'], 'simulation_time': now.isoformat(),
                 'seed': seed, 'scenario': scenario, 'refresh_seconds': SETTINGS['refresh_seconds'],
                 'weekday': ['월','화','수','목','금','토','일'][weekday]},
        'schedule': {'game_day': game is not None, 'fictional_game_start': game_text,
                     'opening': SETTINGS['opening'], 'closing': SETTINGS['closing']},
        'store': {'open': is_open, 'visitors': occupancy, 'crowd': crowd,
                  'checkout_queue': checkout_queue, 'checkout_wait_minutes': checkout_wait},
        'inventory': products, 'zones': zones, 'marking': marking,
        'pickup': {'lead_minutes': SETTINGS['pickup_lead_minutes'], 'slots': slots,
                   'notice': '수령 가능성 시뮬레이션이며 예약·결제·수량 확보를 수행하지 않습니다.'}}
