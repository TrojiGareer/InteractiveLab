# Frontend Deployment Guide (Railway)

## 1. Next.js Service
1. In the existing Railway project, click **New** -> **GitHub Repo** and select the `InteractiveLab` repository.
2. In the deployment settings for the new service:
   - **Root Directory**: `/frontend`
   - **Healthcheck Path**: `/health`
   - **Networking**: Click **Generate Domain** to assign a public URL.

## 2. Environment Variables
In the Next.js service's **Variables** tab, add:
- `NEXT_PUBLIC_API_URL`: `https://interactivelab-production.up.railway.app`

## 3. Verification
Once deployed, verify:
- The main UI loads correctly at the generated domain.
- The health endpoint responds at `https://<your-frontend-url>/health`.