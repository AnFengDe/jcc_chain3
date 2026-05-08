#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

npm whoami >/dev/null
test -z "$(git status --porcelain)" || { echo "git not clean"; exit 1; }

v="$(node -e "const f='lib/version.json';const j=require('./'+f);const s=j.version.split('.').map(Number);s[2]+=1;j.version=s.join('.');require('fs').writeFileSync(f, JSON.stringify(j,null,4)+'\n');process.stdout.write(j.version)")"

test -f package-lock.json && npm ci || npm install --no-package-lock
npm run build
npm test

git add -A
git commit -m "Release v${v}"
git tag "v${v}"
git push origin HEAD
git push origin "v${v}"
npm publish
