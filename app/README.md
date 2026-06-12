# Confiddo Web App

Vite + React 19 + TypeScript + Tailwind v4 SPA for https://confiddo.in/app/ —
a native web client for the same FastAPI backend the Android app uses.

```bash
npm install
npm run dev    # http://localhost:5173/app/
npm test       # 185 parity tests (backend formula ports)
npm run build  # tsc -b + vite build → dist/
```

See the repo-root `README.md` for env vars, deployment and the done/gaps list,
and `../ARCHITECTURE.md` for the parity contract this app is built against.
