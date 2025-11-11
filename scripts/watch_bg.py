#!/usr/bin/env python3
import json, subprocess, time
REPO = 'hochster71/Government_Shutdown_Interactive_Dashboard'
SLEEP = 15
seen = set()
log = '/tmp/auto-merge-watcher.log'
with open(log, 'a') as f:
    f.write('[WATCHER START] ' + time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()) + '\n')
try:
    while True:
        p = subprocess.run(['gh','pr','list','--repo',REPO,'--state','all','--json','number,mergedAt,autoMergeRequest'], capture_output=True, text=True)
        try:
            arr = json.loads(p.stdout)
        except Exception:
            arr = []
        autos = [pr for pr in arr if pr.get('autoMergeRequest') is not None]
        if not autos:
            with open(log,'a') as f:
                f.write('[WATCHER] No auto-merge PRs left. Exiting.\n')
            break
        for pr in autos:
            num = pr.get('number')
            mergedAt = pr.get('mergedAt')
            if mergedAt and num not in seen:
                with open(log,'a') as f:
                    f.write(f'[MERGED] PR #{num} merged at {mergedAt}\n')
                # fetch pr url and merge commit
                pv = subprocess.run(['gh','pr','view',str(num),'--repo',REPO,'--json','url,mergeCommit'], capture_output=True, text=True)
                try:
                    info = json.loads(pv.stdout)
                except Exception:
                    info = {}
                url = info.get('url','(url unavailable)')
                sha = info.get('mergeCommit',{}).get('oid','') if info.get('mergeCommit') else ''
                with open(log,'a') as f:
                    f.write(' PR: ' + url + '\n')
                    f.write(' merge commit: ' + (sha or '(none)') + '\n')
                if sha:
                    rr = subprocess.run(['gh','run','list','--repo',REPO,'--json','headSha,name,status,conclusion','-L','200'], capture_output=True, text=True)
                    try:
                        runs = json.loads(rr.stdout)
                    except Exception:
                        runs = []
                    matched = [f"{r.get('name')}\t{r.get('status')}\t{r.get('conclusion')}" for r in runs if r.get('headSha')==sha]
                    with open(log,'a') as f:
                        if not matched:
                            f.write(' No workflow runs found for commit ' + sha + '\n')
                        else:
                            f.write(' Workflow runs for commit ' + sha + ':\n')
                            for m in matched:
                                f.write('  ' + m + '\n')
                seen.add(num)
        with open(log,'a') as f:
            f.write('[WATCHER] checked at ' + time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()) + ' - ' + str(len(autos)) + ' auto-merge PRs pending\n')
        time.sleep(SLEEP)
except Exception as e:
    with open(log,'a') as f:
        f.write('[WATCHER ERROR] ' + repr(e) + '\n')
finally:
    with open(log,'a') as f:
        f.write('[WATCHER END] ' + time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()) + '\n')
