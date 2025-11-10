#!/usr/bin/env python3
"""Normalize official_parsed_*.json into a canonical feed for the dashboard.

Output: data/official_canonical_<timestamp>.json
"""
import os
import json
from datetime import datetime

DATA_DIR = os.path.join(os.getcwd(), 'data')

def find_latest_official():
    files = [f for f in os.listdir(DATA_DIR) if f.startswith('official_parsed_') and f.endswith('.json')]
    if not files:
        return None
    files.sort()
    return files[-1]

def normalize():
    latest = find_latest_official()
    if not latest:
        print('No official_parsed_*.json files found in data/')
        return

    with open(os.path.join(DATA_DIR, latest), 'r', encoding='utf-8') as f:
        parsed = json.load(f)

    canonical = { 'parsed_at': parsed.get('parsed_at'), 'items': [] }

    for source in parsed.get('sources', []):
        src_name = source.get('source')
        for it in source.get('items', []):
            canonical['items'].append({
                'source': src_name,
                'title': it.get('title'),
                'url': it.get('url'),
                'excerpt': it.get('excerpt'),
            })

    # dedupe by url
    seen = set()
    dedup = []
    for it in canonical['items']:
        if not it.get('url'): continue
        if it['url'] in seen: continue
        seen.add(it['url'])
        dedup.append(it)

    canonical['items'] = dedup

    ts = datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
    outpath = os.path.join(DATA_DIR, f'official_canonical_{ts}.json')
    with open(outpath, 'w', encoding='utf-8') as f:
        json.dump(canonical, f, indent=2, ensure_ascii=False)
    print('Wrote', outpath)

if __name__ == '__main__':
    normalize()
