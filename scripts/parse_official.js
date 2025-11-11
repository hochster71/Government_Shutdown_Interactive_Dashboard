#!/usr/bin/env node
// Parse latest saved official HTML snapshots in data/ and write structured JSON
const fs = require('fs').promises;
const path = require('path');
const cheerio = require('cheerio');

(async function main(){
  const dataDir = path.join(process.cwd(), 'data');
  try {
    const files = await fs.readdir(dataDir);
    const sources = [
      { name: 'WhiteHouse', prefix: 'whitehouse_search_', domain: 'whitehouse.gov' },
      { name: 'Congress', prefix: 'congress_search_', domain: 'congress.gov' },
      { name: 'GovInfo', prefix: 'govinfo_search_', domain: 'govinfo.gov' },
      { name: 'CBO', prefix: 'cbo_search_', domain: 'cbo.gov' }
    ];

    const out = { parsed_at: new Date().toISOString(), sources: [] };

    for (const src of sources) {
      const matched = files.filter(f => f.startsWith(src.prefix)).sort();
      if (matched.length === 0) {
        out.sources.push({ source: src.name, file: null, items: [] });
        continue;
      }
      const latest = matched[matched.length - 1];
      const raw = await fs.readFile(path.join(dataDir, latest), 'utf8').catch(() => '');
      const $ = cheerio.load(raw || '');

      const items = [];
      // Search for common elements: article, .search-result, .g, h3/a, a
      const candidates = $('article, .search-result, .g, h3 a, a');
      candidates.each((i, el) => {
        try {
          const anchor = $(el).is('a') ? $(el) : $(el).find('a').first();
          const href = anchor.attr('href') || '';
          const title = anchor.text().trim() || $(el).text().trim().slice(0,120);
          if (!href || !title) return;
          let url = href;
          if (href.startsWith('/')) url = `https://${src.domain}${href}`;
          if (!url.startsWith('http')) url = `https://${src.domain}/${href}`;
          const excerpt = $(el).find('p').first().text().trim() || $(el).parent().text().trim().slice(0,300);
          items.push({ title: title.substring(0,200), url, excerpt: excerpt.substring(0,500) });
        } catch (e) {
          // ignore
        }
      });

      // dedupe by url
      const dedup = [];
      const seen = new Set();
      for (const it of items) {
        if (!seen.has(it.url)) {
          seen.add(it.url);
          dedup.push(it);
        }
        if (dedup.length >= 50) break;
      }

      out.sources.push({ source: src.name, file: latest, items: dedup });
    }

    const outFile = path.join(dataDir, `official_parsed_${new Date().toISOString().replace(/[:.]/g,'')}.json`);
    await fs.writeFile(outFile, JSON.stringify(out, null, 2), 'utf8');
    console.log('Wrote', outFile);
  } catch (err) {
    console.error('Error parsing official snapshots:', err);
    process.exit(1);
  }
})();
