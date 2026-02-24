# Deployment Checklist

## Secrets and env
- [ ] `server/.env` created from `server/.env.production.example`
- [ ] `server-ml/.env` created from `server-ml/.env.production.example`
- [ ] Strong `JWT_SECRET` set
- [ ] Shared ML auth token set in both `ML_SERVICE_API_KEY` and `ML_API_KEY`
- [ ] `ALLOWED_ORIGINS` set to real frontend domain

## Model artifacts
- [ ] `server-ml/bundles/` contains all required ticker files:
  - `{TICKER}_tcn_final.keras`
  - `{TICKER}_feature_scaler.pkl`
  - `{TICKER}_target_scaler.pkl`
  - `{TICKER}_meta.json`

## Build and run
- [ ] `docker compose -f docker-compose.deploy.yml up --build -d` succeeds
- [ ] `curl http://127.0.0.1:8002/health` returns `ok`
- [ ] `curl http://127.0.0.1:8001/health` returns `ok`

## Smoke tests
- [ ] Register/login works through API
- [ ] `POST /predict` works for at least one ticker
- [ ] Frontend points to deployed API URL (`.env.production`)
