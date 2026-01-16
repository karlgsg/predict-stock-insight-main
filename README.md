# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/7a1b250a-93d9-4277-af7c-e5288d1d7fde

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/7a1b250a-93d9-4277-af7c-e5288d1d7fde) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

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
- Start dev server: `cd server && npm run dev` (defaults to `http://localhost:8000`). Copy `server/.env.example` to `server/.env` and set `JWT_SECRET`/`PORT` as needed.
- Set `VITE_API_URL=http://localhost:8000` in the frontend `.env` to use it.
- Endpoints:
  - `POST /auth/register { name, email, password }` → `{ token, user }`
  - `POST /auth/login { email, password }` → `{ token, user }`
  - `POST /predict { ticker }` (requires `Authorization: Bearer <token>`) → mock prediction payload matching the frontend shape (replace with ML model later).

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/7a1b250a-93d9-4277-af7c-e5288d1d7fde) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
