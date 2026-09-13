#!/usr/bin/env bash
# Layer-2 runner: boots the backend from the sibling app repo (fresh migrate + API seed), builds the
# web app against it, serves the BUILT artifact with vite preview, runs Playwright.
#   ./e2e/run.sh                      # local, from a clean checkout (needs ../confiddo or CONFIDDO_BACKEND_DIR)
#   E2E_BASE_URL=... E2E_WEB_URL=... ./e2e/run.sh   # staging pair (no boot, no build)
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -n "${E2E_BASE_URL:-}" ] && [ -n "${E2E_WEB_URL:-}" ]; then
  echo "E2E target: web=$E2E_WEB_URL api=$E2E_BASE_URL (remote)"
  exec npx playwright test "$@"
fi
BACKEND="${CONFIDDO_BACKEND_DIR:-../../confiddo/backend}"
[ -d "$BACKEND" ] || { echo "backend checkout not found at $BACKEND (set CONFIDDO_BACKEND_DIR)"; exit 1; }
PORT="${E2E_PORT:-8765}"
export E2E_BASE_URL="http://127.0.0.1:$PORT"
export CORS_ORIGINS="http://127.0.0.1:4173,http://localhost:4173"
echo "E2E: booting backend on $E2E_BASE_URL from $BACKEND"
( cd "$BACKEND" && E2E_PORT="$PORT" bash e2e/boot_backend.sh ) &
BOOT_PID=$!
trap 'kill $BOOT_PID 2>/dev/null || true; pkill -f "uvicorn app.main:app --host 127.0.0.1 --port $PORT" 2>/dev/null || true' EXIT
for i in $(seq 1 120); do
  [ -f "$BACKEND/e2e/.world.json" ] && curl -sf "$E2E_BASE_URL/health" >/dev/null && break
  sleep 1
done
[ -f "$BACKEND/e2e/.world.json" ] || { echo "backend seed did not finish"; exit 1; }
export E2E_WORLD_FILE="$BACKEND/e2e/.world.json"
echo "E2E: building web app against $E2E_BASE_URL/v1"
VITE_API_BASE_URL="$E2E_BASE_URL/v1" npm run build >/dev/null
npx playwright test "$@"
