# Backend Deployment Guide (Railway)

## 1. PostgreSQL Database
1. In Railway, click **New Project** -> **Provision PostgreSQL**.
2. Wait for the database to deploy.
3. Railway automatically generates a `DATABASE_URL` for this service.

## 2. FastAPI Service
1. In the same project, click **New** -> **GitHub Repo** and select the `InteractiveLab` repository.
2. In the deployment settings for the backend service:
   - **Root Directory**: `backend`
   - **Builder**: Dockerfile (Railway should detect `backend/Dockerfile`).

## 3. Environment Variables
In the FastAPI service's **Variables** tab, add:
- `DATABASE_URL`: Use the reference from the PostgreSQL service (e.g., `${{Postgres.DATABASE_URL}}`).
- `CORS_ORIGINS`: Set this to your frontend URL once deployed (e.g., `https://interactivelab-frontend.up.railway.app,http://localhost:3000`).

## 4. Verification
Once deployed, verify the health endpoints:
- `https://<your-railway-url>/health`
- `https://<your-railway-url>/health/db`
- `https://<your-railway-url>/docs`