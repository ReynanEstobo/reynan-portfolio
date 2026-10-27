# Publish the portfolio

## 1. Upload source to GitHub

Create an empty GitHub repository named `reynan-portfolio` under your account.
Do not initialize it with a README or license. In the portfolio root terminal:

```powershell
git init
git branch -M main
git add .
git status --short
```

Check that no `.env`, `node_modules`, or `dist` files appear in the staged list.
The `.env.example` files are safe templates. Then:

```powershell
git commit -m "Prepare portfolio for deployment"
git remote add origin https://github.com/ReynanEstobo/reynan-portfolio.git
git push -u origin main
```

If Git asks you to authenticate, complete the GitHub sign-in yourself.

## 2. Check Supabase

Use your existing project. If already applied, do not rerun the initial migration.
Apply any missing migrations in numeric order through the SQL editor:
`001_initial.sql`, `002_ai_driven_profile.sql`, `003_project_frameworks.sql`.
Use the Session Pooler connection string for the backend's DATABASE_URL.
Replace its password placeholder with the database password; URL-encode special characters.

## 3. Deploy the API on Render

Create a **Web Service**, connect the GitHub repository, and use:

| Setting | Value |
|---|---|
| Runtime | Node |
| Root Directory | Leave blank (repository root) |
| Build Command | `npm ci --workspace=backend --omit=dev` |
| Start Command | `npm start --workspace=backend` |
| Health Check Path | `/api/health` |

Choose the instance plan you want before creating the service. Do not add a separate database on Render; Supabase already provides it.

Set these environment variables in Render, never in GitHub source:

| Variable | Value |
|---|---|
| NODE_ENV | `production` |
| DATABASE_URL | Your Supabase Session Pooler URL |
| FRONTEND_ORIGIN | Initially `http://localhost:5173`; replace in step 5 |
| CONTACT_RECIPIENT | `estoboreynan17@gmail.com` |
| RESEND_API_KEY | Your actual Resend key, or omit for storage-only messages |
| EMAIL_FROM | A sender allowed by your Resend account |

Let Render supply PORT. Save the resulting HTTPS service URL.
Open `<render-url>/api/health`, `/api/profile`, and `/api/projects`.
Health only checks the server; profile and projects also test database access.

## 4. Deploy the frontend on Vercel

Import the same GitHub repository. **Keep Root Directory at the repository root**.
The root `vercel.json` defines Vite, `npm ci`, `npm run build`, and `frontend/dist`.
Add `VITE_API_URL` with the HTTPS Render service URL, without `/api` or a trailing slash.
Deploy, then copy the production URL Vercel assigns.

Only the API base URL goes into frontend environment variables. Never put the database URL or Resend key there.

## 5. Connect the two services

On Render, replace FRONTEND_ORIGIN with the exact Vercel production origin:
`https://your-project.vercel.app` (no path or trailing slash). Save and redeploy.
If VITE_API_URL changes in Vercel, redeploy the frontend so Vite embeds its new value.
Preview deployment origins are not automatically allowed by backend CORS.

## 6. Verify the live site

- Open the Vercel production URL on desktop and phone.
- Verify profile and project API requests succeed in browser Network tools.
- Test project previews, avatar interactions, and navigation.
- Submit one clearly labeled contact test; confirm it appears in Supabase contact_messages.
- If Resend is configured, verify email delivery separately in its dashboard and inbox.

The frontend has fallback content, so a visible homepage alone does not prove the API works.
If email is not configured, messages can still be stored, but no email notification is sent.

Hosting references: https://render.com/docs/deploy-node-express-app and https://vercel.com/docs/frameworks/frontend/vite
