# TCP handshake simulator

The frontend is an interactive view of the backend's TCP three-way handshake simulator. Pressing **Run simulation** sends latency and initial sequence-number values to `POST /api/v1/simulations`.

FastAPI calculates the packets, saves the completed run in PostgreSQL, and returns the data used for the timeline and packet inspector.

## Run the complete stack with Docker

From the repository root:

```bash
cp .env.example .env
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). The API is available at [http://localhost:8000](http://localhost:8000), and its documentation is at [http://localhost:8000/docs](http://localhost:8000/docs).

`NEXT_PUBLIC_API_URL` defaults to `http://localhost:8000`. Set it to your public API URL before building the frontend for a cloud deployment.

## Frontend-only development

Start the backend and database, then run this from `frontend/`:

```bash
npm run dev
```

The backend allows the local frontend origins through `CORS_ORIGINS` in `docker-compose.yml`.
