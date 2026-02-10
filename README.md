# Predict Stock Insight

Full-stack stock prediction app:
- Frontend: Vite + React + TypeScript
- API/Auth: Express (`server/`)
- ML Inference: FastAPI (`server-ml/`)

## Quick Start

1. Frontend env (`.env` at repo root):
```env
VITE_API_URL=http://localhost:8001
```

2. API env:
```bash
cp server/.env.example server/.env
```

3. ML env:
```bash
cp server-ml/.env.example server-ml/.env
```

4. Run ML service:
```bash
cd server-ml
source .venv/bin/activate
uvicorn app:app --host 127.0.0.1 --port 8002 --reload
```

5. Run API service:
```bash
cd server
npm install
npm run dev
```

6. Run frontend:
```bash
npm install
npm run dev
```

## Model Bundles

Put trained files in `server-ml/bundles/` using this naming convention:
- `{TICKER}_tcn_final.keras`
- `{TICKER}_feature_scaler.pkl`
- `{TICKER}_target_scaler.pkl`
- `{TICKER}_meta.json`

Example:
- `GLD_tcn_final.keras`
- `GLD_feature_scaler.pkl`
- `GLD_target_scaler.pkl`
- `GLD_meta.json`

## Bundle Sync From Google Drive

Use the sync script in `server-ml`:
```bash
cd server-ml
./scripts/sync_bundles_from_drive.sh
```

It uses `DRIVE_REMOTE` and `DRIVE_BUNDLE_PATH` from `server-ml/.env`.

## Notes

- Commit `*.env.example` files, do not commit `.env`.
- Root `.gitignore` is configured to keep local env files and model bundles out of git.
- Detailed ML-service docs: `server-ml/README.md`.
