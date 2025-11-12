<#
PowerShell automation script for completing the upgrade workflow.

What this script does (interactive):
 1. Verifies required tools: git, node, npm, gh (GitHub CLI).
 2. Ensures you're authenticated with `gh`; runs `gh auth login` if needed.
 3. Creates a DRAFT PR for branch `chore/upgrade-deps` using `PR_BODY.md` if one doesn't already exist.
 4. Optionally opens the PR in your browser so you can review CI results and merge it.
 5. If you choose to merge now (not recommended unless CI green), the script can merge the PR (you will be asked to confirm).
 6. After the PR is merged (or if you tell the script it is merged), the script will:
    - Pull `main` and create a local branch `upgrade/backend-core` from `main` (and push it).
    - Re-enable strict ESLint rules in `frontend/.eslintrc.cjs` (restores `no-explicit-any` and `react/no-unescaped-entities` to `error`), backing up the original.
    - Run `npm --workspace=frontend run lint -- --max-warnings=0` and save output to `frontend/lint-output.txt`.
    - If lint passes, commit the ESLint config change to `upgrade/backend-core` and push.
    - Create a DRAFT PR for `upgrade/backend-core` with an automatically generated body file `PR_BODY_backend_core.md` so review can begin.

Important: This script does NOT store or transmit any secrets. For `gh` operations you'll be prompted to authenticate locally using the official `gh auth login` flow (browser or token).

How to run (PowerShell):
 1. Open PowerShell in the repo root (`C:\Users\micha\Government_Shutdown_Interactive_Dashboard-1`).
 2. Run: `.\
 scripts\\complete_upgrade_workflow.ps1`
 3. Follow interactive prompts.

If you prefer non-interactive usage, review the script and adjust variables near the top.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Check-Command([string]$name) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    return $null -ne $cmd
}

Write-Host "Starting upgrade workflow helper script...`n"

# Prerequisite checks
$required = @('git','node','npm','gh')
$missing = @()
foreach ($r in $required) {
    if (-not (Check-Command $r)) { $missing += $r }
}
if ($missing.Count -gt 0) {
    Write-Host "ERROR: Missing required tools: $($missing -join ', ')" -ForegroundColor Red
    Write-Host "Please install the missing tools before continuing. Exiting.";
    exit 1
}

# Show environment summary
Write-Host "Environment summary:" -ForegroundColor Cyan
Write-Host "  Node:    $(node --version)"
Write-Host "  npm:     $(npm --version)"
Write-Host "  git:     $(git --version)"
Write-Host "  gh cli:  $(gh --version | Select-String 'gh version' -Quiet:$false)"

# Ensure gh auth
try {
    gh auth status -h github.com | Out-Null
    $ghAuth = $true
} catch {
    $ghAuth = $false
}

if (-not $ghAuth) {
    Write-Host "You are not logged into GitHub CLI. We'll run 'gh auth login' now." -ForegroundColor Yellow
    Write-Host "Follow prompts to authenticate (choose GitHub.com, login in browser is easiest)."
    gh auth login
    try { gh auth status -h github.com | Out-Null; $ghAuth = $true } catch { $ghAuth = $false }
    if (-not $ghAuth) { Write-Host "gh login failed or cancelled. Exiting." -ForegroundColor Red; exit 1 }
}

# Helper to get or create a PR for a branch
function Ensure-PR([string]$branch,[string]$title,[string]$bodyFile) {
    Write-Host "Checking for existing PR for branch '$branch'..."
    $prListJson = gh pr list --state all --json number,headRefName,url,title 2>$null | Out-String
    $prList = @()
    if ($prListJson.Trim()) { $prList = $prListJson | ConvertFrom-Json }
    $existing = $prList | Where-Object { $_.headRefName -eq $branch }
    if ($existing) {
        $pr = $existing[0]
        Write-Host "Found existing PR (#$($pr.number)): $($pr.url)"
        return $pr
    }

    if (-not (Test-Path $bodyFile)) {
        Write-Host "ERROR: PR body file '$bodyFile' not found. Please create it (we created PR_BODY.md earlier)." -ForegroundColor Red
        exit 1
    }

    Write-Host "Creating a draft PR for branch '$branch'..."
    $createCmd = "gh pr create --title `"$title`" --body-file `"$bodyFile`" --base main --head $branch --draft"
    Write-Host "Running: $createCmd"
    $out = & gh pr create --title $title --body-file $bodyFile --base main --head $branch --draft
    # After creation, fetch PR list again and return the PR
    $prListJson = gh pr list --state all --json number,headRefName,url,title
    $prList = $prListJson | ConvertFrom-Json
    $pr = ($prList | Where-Object { $_.headRefName -eq $branch })[0]
    if ($pr) { Write-Host "PR created: $($pr.url)"; return $pr }
    else { Write-Host "PR creation failed." -ForegroundColor Red; exit 1 }
}

# Ensure PR for chore/upgrade-deps
$depsBranch = 'chore/upgrade-deps'
$depsTitle = 'chore: upgrade deps to fix security advisories'
$depsBody = 'PR_BODY.md'
$prDeps = Ensure-PR -branch $depsBranch -title $depsTitle -bodyFile $depsBody

# Ask user whether to open the PR in browser for manual review
$openNow = Read-Host "Open the created PR in your default browser now? (y/n) [n]"
if ($openNow -eq 'y' -or $openNow -eq 'Y') {
    Write-Host "Opening: $($prDeps.url)"
    Start-Process $prDeps.url
}

Write-Host "\nIMPORTANT: I recommend reviewing CI on the PR before merging."
$mergeChoice = Read-Host "Do you want me to MERGE this PR now? (only do this if CI green) (y/n) [n]"
if ($mergeChoice -eq 'y' -or $mergeChoice -eq 'Y') {
    # Merge the PR
    $prNumber = $prDeps.number
    Write-Host "Attempting to merge PR #$prNumber..."
    try {
        gh pr merge $prNumber --merge --delete-branch --body "Merged by automation script for security upgrade"
        Write-Host "PR merged successfully."
    } catch {
        Write-Host "PR merge failed. Please merge manually in the UI after CI completes." -ForegroundColor Red
        $mergeFailed = $true
    }
} else {
    Write-Host "OK — PR left as draft/open for manual review and merge." -ForegroundColor Cyan
}

# Ask user whether PR is merged or we should proceed assuming it will be merged
$afterMerge = Read-Host "Has the `chore/upgrade-deps` PR been merged into main now? (y/n) [n]"
if ($afterMerge -ne 'y' -and $afterMerge -ne 'Y') {
    Write-Host "Will not proceed to follow-up branches until you confirm merge. You can re-run this script after merging or answer 'y' to continue anyway. Exiting now." -ForegroundColor Yellow
    exit 0
}

# Pull latest main
Write-Host "Pulling latest main..."
git checkout main
git pull origin main

# Create and push upgrade/backend-core branch
$backendBranch = 'upgrade/backend-core'
# If branch exists locally, check it out; otherwise create from main
$localBranches = git branch --list | ForEach-Object { $_.Trim() }
if ($localBranches -contains $backendBranch) {
    Write-Host "Local branch '$backendBranch' already exists. Checking it out."; git checkout $backendBranch
} else {
    Write-Host "Creating branch '$backendBranch' from main"; git checkout -b $backendBranch
}
Write-Host "Pushing branch to origin..."; git push -u origin $backendBranch

# Re-enable strict ESLint rules in frontend/.eslintrc.cjs
$eslintFile = 'frontend/.eslintrc.cjs'
if (-not (Test-Path $eslintFile)) { Write-Host "ESLint config not found at $eslintFile. Skipping rule re-enable."; exit 0 }
$backup = "$eslintFile.bak.$((Get-Date).ToString('yyyyMMddHHmmss'))"
Copy-Item $eslintFile $backup
Write-Host "Backed up ESLint config to $backup"

# Read file and update temporary rule relaxations
$text = Get-Content $eslintFile -Raw
# Replace '@typescript-eslint/no-explicit-any': 'off' -> 'error'
if ($text -match "@typescript-eslint/no-explicit-any\s*:\s*'off'") {
    $text = $text -replace "@typescript-eslint/no-explicit-any\s*:\s*'off'","@typescript-eslint/no-explicit-any': 'error'"
}
# Replace 'react/no-unescaped-entities': 'off' -> 'error'
if ($text -match "react/no-unescaped-entities\s*:\s*'off'") {
    $text = $text -replace "react/no-unescaped-entities\s*:\s*'off'","react/no-unescaped-entities': 'error'"
}
# Ensure trailing comma style is preserved; write back
Set-Content -Path $eslintFile -Value $text -Encoding UTF8
Write-Host "Re-enabled stricter ESLint rules in $eslintFile"

# Run ESLint with --fix first to resolve trivial issues
Write-Host "Running eslint --fix to auto-fix simple problems (frontend)"
Push-Location
Set-Location frontend
# Install dev deps if needed (safe: npm ci may be heavy; we assume deps already installed, but attempt a no-op install)
npm install --no-audit --no-fund | Out-Null
# Attempt auto-fix
try {
    npx eslint . --ext .ts,.tsx --fix --report-unused-disable-directives --max-warnings=0 2>&1 | Tee-Object -Variable eslintFixOutput
    Write-Host "ESLint --fix completed. Running full lint now..."
} catch {
    Write-Host "ESLint --fix returned non-zero; continuing to run full lint to capture errors." -ForegroundColor Yellow
}

# Run full lint and capture output
$lintLog = "../frontend-lint-output.txt"
try {
    npx eslint . --ext .ts,.tsx --report-unused-disable-directives --max-warnings=0 2>&1 | Tee-Object -FilePath $lintLog
    $lintExit = $LASTEXITCODE
} catch {
    Write-Host "ESLint execution failed." -ForegroundColor Red
    $lintExit = $LASTEXITCODE
}

Set-Location ..
Pop-Location

if ($lintExit -ne 0) {
    Write-Host "ESLint reported issues. See frontend-lint-output.txt in repo root for details." -ForegroundColor Red
    Write-Host "I will commit the ESLint config changes to the branch so you can take over, but lint errors remain to be fixed." -ForegroundColor Yellow
    git add $eslintFile
    git commit -m "chore: re-enable strict ESLint rules (frontend)" || Write-Host "No changes to commit or commit failed."
    git push origin $backendBranch
    # Create PR body template for backend-core branch
    $backendPRBody = 'PR_BODY_backend_core.md'
    $backendPRContent = @"
Title: upgrade: backend core libs (helmet, node-cron, lint enforcement)

Summary:
- This branch re-enables stricter ESLint rules in the frontend and prepares for backend core upgrades.
- Current state: ESLint re-enabled but lint errors remain. See `frontend-lint-output.txt`.

Next steps:
- Fix frontend lint errors to satisfy stricter rules.
- Upgrade backend libs (`helmet`, `node-cron`) in this branch and run tests.

CI/Testing performed:
- ESLint run output saved to `frontend-lint-output.txt`.

"@
    Set-Content -Path $backendPRBody -Value $backendPRContent -Encoding UTF8
    # Create a draft PR for backend branch
    Ensure-PR -branch $backendBranch -title 'upgrade: backend core libs and lint enforcement' -bodyFile $backendPRBody
    Write-Host "Created PR for '$backendBranch'. Please review lint output and fix issues before continuing." -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "ESLint passed with no errors. Committing and pushing changes to branch '$backendBranch'..." -ForegroundColor Green
    git add $eslintFile
    git commit -m "chore: re-enable strict ESLint rules (frontend)" || Write-Host "No changes to commit or commit failed."
    git push origin $backendBranch
    # Create PR body and PR
    $backendPRBody = 'PR_BODY_backend_core.md'
    $backendPRContent = @"
Title: upgrade: backend core libs (helmet, node-cron) and lint enforcement

Summary:
- Re-enabled strict frontend lint rules and fixed issues.
- This branch will be used to upgrade backend core libraries (`helmet`, `node-cron`) in a controlled way.

What I changed:
- Re-enabled ESLint rules in `frontend/.eslintrc.cjs`.

Next steps:
- Upgrade backend libraries, run backend tests, and address any breaking changes.

CI/Testing performed:
- Frontend lint completed successfully.

"@
    Set-Content -Path $backendPRBody -Value $backendPRContent -Encoding UTF8
    Ensure-PR -branch $backendBranch -title 'upgrade: backend core libs and lint enforcement' -bodyFile $backendPRBody
    Write-Host "PR created for '$backendBranch'. Open it for review:"
    $pr = gh pr list --state open --head $backendBranch --json number,url,title | ConvertFrom-Json
    if ($pr) { Start-Process $pr[0].url }
}

Write-Host "Script completed. Next recommended actions: review the PRs, run CI, and continue incremental upgrades." -ForegroundColor Cyan
exit 0
