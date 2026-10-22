#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env. Edit it and add your Replicate API token before continuing."
fi
if [ ! -d node_modules ]; then npm install; fi
npm start
