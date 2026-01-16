

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## API configuration (predictions)

- The stock search calls `POST {VITE_API_URL}/predict` with body `{ "ticker": "AAPL" }` and expects price/change/prediction fields in return.
- Set `VITE_API_URL` in your `.env` when running locally (e.g., `VITE_API_URL=http://localhost:8000`).
- If `VITE_API_URL` is not set, the UI falls back to mock data for demo purposes.

## Auth (JWT)

- Auth pages call `POST {VITE_API_URL}/auth/login` and `/auth/register` with JSON bodies `{ email, password }` (login) and `{ name, email, password }` (register).
- API responses should return `{ token, user: { name, email } }`; the token is stored locally and passed as `Authorization: Bearer <token>` to prediction requests.
- Auth state persists in browser `localStorage` under `authUser` via a shared `AuthProvider`; logout clears it. On mobile, swap this for secure storage.
- If the API returns 401, the app will log the user out and ask them to sign in again.
- If `VITE_API_URL` is missing, the app shows a mock-data notice and prediction searches fall back to fake data.

## Local API server (Express + JWT)

- Server lives in `server/`. Install deps with `cd server && npm install`.
- Start dev server: `cd server && npm run dev` (defaults to `http://localhost:8001`). Copy `server/.env.example` to `server/.env` and set `JWT_SECRET`/`PORT` as needed.
- Database: Prisma + SQLite (`DATABASE_URL` in `server/.env`, default `file:./prisma/dev.db`). Run `cd server && npx prisma generate` if you change the schema.
- Auth now issues access + refresh tokens: access token TTL defaults to 15m (`ACCESS_TOKEN_TTL`), refresh token TTL 7 days (`REFRESH_TOKEN_TTL_DAYS`). `POST /auth/refresh` rotates refresh tokens.
- Set `VITE_API_URL=http://localhost:8001` in the frontend `.env` to use it (or match your chosen API port).
- Endpoints:
  - `POST /auth/register { name, email, password }` → `{ token, user }`
  - `POST /auth/login { email, password }` → `{ token, user }`
  - `POST /auth/refresh { refreshToken }` → `{ token, refreshToken, user }`
  - `POST /predict { ticker }` (requires `Authorization: Bearer <token>`) → mock prediction payload matching the frontend shape (replace with ML model later).
  - `GET /symbols?q=tes&limit=10` → search or list stock symbols/names (static sample list in `server/data/symbols.json`).
- Refresh symbols from Polygon: set `POLYGON_API_KEY` in `server/.env`, then run `cd server && npm run symbols:refresh` to pull active US stock tickers into `server/data/symbols.json` (pagination capped by `MAX_PAGES` in `scripts/fetch-symbols.js`).
