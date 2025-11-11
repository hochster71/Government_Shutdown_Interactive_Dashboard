#!/usr/bin/env bash
set -euo pipefail

# create_pat_helper.sh
#
# Interactive helper to guide you through creating a GitHub Personal Access Token (PAT)
# and placing it into this environment so scripts (like `scripts/maintain_repo.sh`) can
# run authenticated actions.
#
# IMPORTANT SECURITY NOTES:
# - This script will open the GitHub token creation page in your browser and then prompt
#   you to paste the token. Do NOT paste your token into chat or share it.
# - Storing a token in a shell profile or file grants programs running as your user access
#   to that token. Only store it if you understand the security implications.
# - Preferred: use `gh auth login` interactive web flow instead of storing a PAT.

REQUIRED_TOOLS=(gh xdg-open)
for t in "${REQUIRED_TOOLS[@]}"; do
  if ! command -v "$t" >/dev/null 2>&1; then
    echo "Warning: recommended tool '$t' is not available in PATH. Some steps may be manual."
  fi
done

GITHUB_TOKEN_URL="https://github.com/settings/tokens/new?scopes=repo,workflow&description=PAT+for+Government_Shutdown_Interactive_Dashboard+automation"

echo "This helper will open your browser to the GitHub Personal Access Token creation page"
echo "with recommended scopes (repo, workflow). Create a token and paste it back here when prompted."
echo
read -r -p "Open GitHub token creation page now? [Y/n] " open_resp
open_resp=${open_resp:-Y}
if [[ "$open_resp" =~ ^[Yy] ]]; then
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$GITHUB_TOKEN_URL" || true
  elif [[ -n "${BROWSER:-}" ]]; then
    "$BROWSER" "$GITHUB_TOKEN_URL" || true
  else
    echo "Please open this URL in your browser to create a new token:" 
    echo "  $GITHUB_TOKEN_URL"
  fi
fi

echo
echo "Recommended scopes to select on the token creation page:"
echo "  - repo        (full control of private repositories)"
echo "  - workflow    (update/trigger GitHub Actions runs)"
echo
echo "When you finish creating the token, copy it to the clipboard and paste it below."
echo "If you want to cancel, press Ctrl+C."
echo
read -r -p "Paste the token here: " PAT
if [[ -z "$PAT" ]]; then
  echo "No token entered. Exiting." >&2
  exit 1
fi

echo
echo "You entered a token of length ${#PAT} characters."
read -r -p "Proceed to authenticate `gh` with this token (it will be stored by gh)? [y/N] " ok
if [[ ! "$ok" =~ ^[yY] ]]; then
  echo "Token not applied. You can run 'gh auth login --with-token' later.";
  exit 0
fi

echo "$PAT" | gh auth login --with-token >/dev/null 2>&1 || {
  echo "gh auth login failed. Please ensure gh CLI is installed and you have network access." >&2
  exit 1
}

echo "gh is now authenticated. Verifying..."
if gh auth status >/dev/null 2>&1; then
  gh auth status
  echo
  echo "gh authentication successful. You can now run scripts that use gh or GH_TOKEN."
else
  echo "gh authentication did not succeed. Please try 'gh auth login' manually." >&2
  exit 1
fi

echo
read -r -p "Would you like to export the token to your current shell session as GH_TOKEN so scripts can pick it up? [y/N] " export_now
if [[ "$export_now" =~ ^[yY] ]]; then
  export GH_TOKEN="$PAT"
  echo "GH_TOKEN exported to current shell session. To persist it for future shells,"
  read -r -p "  Add 'export GH_TOKEN' to your ~/.bashrc (or ~/.zshrc)? [y/N] " persist
  if [[ "$persist" =~ ^[yY] ]]; then
    profile="${SHELL##*/}"
    rcfile="~/.bashrc"
    if [[ "$profile" == "zsh" ]]; then rcfile="~/.zshrc"; fi
    echo "Exporting to $rcfile (appending)."
    echo "# GitHub PAT for repo automation (created $(date -u +%Y-%m-%dT%H:%M:%SZ) UTC)" >> "$HOME/${rcfile##~/.}"
    echo "export GH_TOKEN=\"$PAT\"" >> "$HOME/${rcfile##~/.}"
    echo "Wrote token export to $rcfile. Be aware this stores the token in plain text on disk."
  fi
fi

echo
echo "Helper done. For safety: do NOT paste the token into chat or share it."
echo "You can now run the maintainer script like this (example):"
echo
echo "  GH_TOKEN=\"<your token>\" ./scripts/maintain_repo.sh --pr 36 --enable-auto-fix --rerun-checks --merge"
echo
echo "Or simply run:"
echo "  ./scripts/maintain_repo.sh --pr 36 --enable-auto-fix --rerun-checks --merge"
echo "if gh auth was stored by gh auth login above."
