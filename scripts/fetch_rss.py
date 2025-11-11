#!/usr/bin/env python3
"""Fetch curated RSS feeds from trusted US outlets and save normalized JSON.

Saves to data/latest_rss_<timestamp>.json
"""
import os
import sys
import json
import time
from datetime import datetime
from urllib.request import urlopen, Request
import xml.etree.ElementTree as ET

DATA_DIR = os.path.join(os.getcwd(), 'data')
os.makedirs(DATA_DIR, exist_ok=True)

FEEDS = [
    ("New York Times", "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml"),
    ("AP", "https://apnews.com/hub/politics/rss"),
    ("NPR", "https://feeds.npr.org/1001/rss.xml"),
    ("Politico", "https://www.politico.com/rss/politics08.xml"),
    ("Reuters", "https://www.reuters.com/tools/rss"),
    ("Washington Post", "http://feeds.washingtonpost.com/rss/politics"),
    ("Bloomberg", "https://www.bloomberg.com/politics/rss.xml"),
]

def fetch(url):
    try:
        req = Request(url, headers={"User-Agent": "Government-Shutdown-Dashboard/1.0 (fetch_rss)"})
        attempts = 0
        while attempts < 3:
            try:
                with urlopen(req, timeout=15) as resp:
                    return resp.read()
            except Exception as e:
                attempts += 1
                if attempts >= 3:
                    raise
                time.sleep(1 + attempts)
    except Exception as e:
        print(f"Failed to fetch {url}: {e}", file=sys.stderr)
        return None

def parse_rss(content):
    try:
        root = ET.fromstring(content)
    except Exception:
        return []

    items = []
    # RSS or Atom
    for item in root.findall('.//item'):
        title = item.findtext('title') or ''
        link = item.findtext('link') or ''
        pub = item.findtext('pubDate') or item.findtext('published') or ''
        desc = item.findtext('description') or item.findtext('summary') or ''
        items.append({'title': title.strip(), 'url': link.strip(), 'publishedAt': pub.strip(), 'description': (desc or '').strip()})
    # Atom fallback
    if not items:
        for entry in root.findall('.//{http://www.w3.org/2005/Atom}entry'):
            title = entry.findtext('{http://www.w3.org/2005/Atom}title') or ''
            link_el = entry.find('{http://www.w3.org/2005/Atom}link')
            link = link_el.get('href') if link_el is not None else ''
            pub = entry.findtext('{http://www.w3.org/2005/Atom}updated') or entry.findtext('{http://www.w3.org/2005/Atom}published') or ''
            desc = entry.findtext('{http://www.w3.org/2005/Atom}summary') or ''
            items.append({'title': title.strip(), 'url': link.strip(), 'publishedAt': pub.strip(), 'description': (desc or '').strip()})
    return items

def main():
    timestamp = datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
    aggregated = {'fetched_at': timestamp, 'sources': []}
    for name, url in FEEDS:
        print(f'Fetching {name}...')
        content = fetch(url)
        if not content:
            aggregated['sources'].append({'source': name, 'url': url, 'items': []})
            continue
        items = parse_rss(content)
        # keep first 20 items
        aggregated['sources'].append({'source': name, 'url': url, 'items': items[:20]})
        time.sleep(0.5)

    outpath = os.path.join(DATA_DIR, f'latest_rss_{timestamp}.json')
    with open(outpath, 'w', encoding='utf-8') as f:
        json.dump(aggregated, f, ensure_ascii=False, indent=2)
    print('Wrote', outpath)

if __name__ == '__main__':
    main()
