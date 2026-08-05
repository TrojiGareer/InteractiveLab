# InteractiveLab

InteractiveLab is an educational web application for communication-protocol
simulations. The local architecture is:

`Next.js frontend -> FastAPI API -> SQLAlchemy -> PostgreSQL`

The first supported protocol is the TCP Three-Way Handshake. Protocol metadata
is a static API catalog, not a database table, so additional protocols can be
registered without a schema migration.

## Requirements

- Docker Compose
- For running tests outside Docker: Python 3.12 and PostgreSQL 17 (or
  compatible PostgreSQL with JSONB support)

## Configuration and startup

Create a local environment file without committing it:

```bash
cp .env.example .env
```

Set `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DATABASE_URL`,
`CORS_ORIGINS`, and optionally `NEXT_PUBLIC_API_URL` in `.env`. The example
contains local development placeholders only; use your own password locally.

Start the application:

```bash
docker compose up -d --build
```

The frontend is available on `http://localhost:3000`, the API on
`http://localhost:8000`, and Swagger on `http://localhost:8000/docs`.

The backend container applies Alembic migrations before it starts. To run them
manually instead:

```bash
docker compose exec backend alembic upgrade head
```

## Main API endpoints

- `GET /health` and `GET /health/db`
- `GET /api/v1/protocols` and `GET /api/v1/protocols/{protocol_id}`
- `POST`, `GET /api/v1/simulations` and `GET /api/v1/simulations/{id}`
- `POST`, `GET /api/v1/scenarios`, plus `GET`, `PUT`, `PATCH`, `DELETE`
  for `/api/v1/scenarios/{id}`
- `POST /api/v1/scenarios/{id}/run`

Simulation runs are immutable history: the API intentionally has no update or
delete endpoint for a completed run. A direct run has `scenario_id = null`.
Running a scenario snapshots its current parameters. Deleting that scenario
preserves the run history and PostgreSQL's `ON DELETE SET NULL` changes the
historical run's `scenario_id` to `null`.

## Tests

Unit tests do not require a database:

```bash
cd backend
python -m compileall app tests
pytest -q tests/test_tcp_simulator.py
```

API tests use the separate `db-test` service on port `5433`; it uses a `tmpfs`
data directory and never targets the development database or its volume.

```bash
docker compose -f docker-compose.test.yml up -d db-test
cd backend
DATABASE_URL=postgresql+psycopg://interactive_test:interactive_test@127.0.0.1:5433/interactive_lab_test \
  alembic upgrade head
TEST_DATABASE_URL=postgresql+psycopg://interactive_test:interactive_test@127.0.0.1:5433/interactive_lab_test \
  pytest -q tests/test_api.py
```

`TEST_DATABASE_URL` is deliberately separate from `DATABASE_URL`; the test
fixture rejects a test URL that is identical to the development URL.
