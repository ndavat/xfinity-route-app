#!/usr/bin/env bash
set -e

# === Config ===
EMAIL="ndavat@gmail.com"   # <-- replace with your GitHub email
REPO="ndavat/xfinity-route-app" # <-- replace with your repo if different

echo "🔑 Generating SSH key for GitHub..."

# Generate SSH key if it doesn't already exist
if [ ! -f "$HOME/.ssh/id_ed25519" ]; then
  ssh-keygen -t ed25519 -C "$EMAIL" -f "$HOME/.ssh/id_ed25519" -N ""
else
  echo "✅ SSH key already exists, skipping generation."
fi

# Start ssh-agent and add key
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Install GitHub CLI if not installed
if ! command -v gh &> /dev/null; then
  echo "📦 Installing GitHub CLI..."
  sudo apt update && sudo apt install -y gh
fi

# Authenticate with GitHub
echo "🌐 Logging into GitHub (follow the prompts)..."
gh auth login -h github.com -p https

# Upload SSH key to GitHub
echo "📤 Uploading SSH public key to GitHub..."
gh ssh-key add ~/.ssh/id_ed25519.pub --title "Oracle-VM-$(hostname)"

# Switch the repo remote to SSH
if [ -d ".git" ]; then
  echo "🔄 Updating Git remote to SSH..."
  git remote set-url origin git@github.com:$REPO.git
fi

echo "✅ SSH setup complete! You can now use 'git pull' and 'git push' without passwords."
