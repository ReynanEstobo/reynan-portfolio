# Reynan Estobo â€” Portfolio

Separated React frontend and Express/PostgreSQL API for Reynan Estobo's developer portfolio.

## Local setup

1. Copy `backend/.env.example` to `backend/.env` and add the Supabase Postgres URL and Resend key.
2. Run `supabase/migrations/001_initial.sql` in the Supabase SQL editor.
3. Run `npm install`, then `npm run dev`.
4. Open `http://localhost:5173`. The API runs at `http://localhost:4000`.

## Production

- **Supabase:** run the migration and add `DATABASE_URL` to Render.
- **Render:** create a Node web service rooted at `backend`, with build command `npm install` and start command `npm start`. Set `FRONTEND_ORIGIN` to the Vercel URL.
- **Vercel:** import `frontend`, set build command `npm run build`, output `dist`, and set `VITE_API_URL` to the Render API URL (without a trailing slash).
- **Resend:** verify a sending domain, then set `RESEND_API_KEY` and optionally `EMAIL_FROM` in Render. Contact messages are always stored even when email delivery fails.

Never expose `DATABASE_URL` or `RESEND_API_KEY` to the frontend.

