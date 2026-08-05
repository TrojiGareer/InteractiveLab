# InteractiveLab Repository Instructions

## Project overview

InteractiveLab is an educational web application for simulating communication protocols.

The current protocol is TCP Three-Way Handshake. The architecture must allow additional protocols to be added later without duplicating routing, validation, or execution logic.

## Repository structure

* `backend/`: FastAPI, SQLAlchemy, Alembic, PostgreSQL and pytest.
* `frontend/`: Next.js, React, TypeScript and Tailwind CSS.
* `docs/`: project documentation.
* `docker-compose.yml`: local application services.
* `.env.example`: environment-variable template without real credentials.

Always inspect the actual repository structure and current file contents before proposing or making changes. Do not assume that a referenced file exists.

## Technology stack

### Backend

* Python 3.12
* FastAPI
* Uvicorn
* SQLAlchemy 2
* Pydantic 2
* Alembic
* PostgreSQL with JSONB
* pytest

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS
* App Router

### Local services

* Frontend: port `3000`
* Backend: port `8000`
* PostgreSQL: port `5432`
* Swagger: `http://localhost:8000/docs`

## Architecture rules

* API routes belong in `backend/app/api/routes/`.
* Pydantic request and response models belong in `backend/app/schemas/`.
* SQLAlchemy models belong in `backend/app/models/`.
* Protocol execution logic belongs in `backend/app/services/`.
* Protocol-specific simulators belong in `backend/app/services/simulators/`.
* Routes must reuse service-layer simulation logic and must not duplicate protocol algorithms.
* Do not create a PostgreSQL table for the static protocol catalog unless a future task explicitly requires database-managed protocols.
* Keep protocol constraints and defaults in a single source of truth whenever practical.

## Backend domain rules

### SimulationRun

* `SimulationRun` is immutable history.
* Do not add `PUT`, `PATCH`, or `DELETE` operations for completed simulation runs.
* A run stores the protocol, input-parameter snapshot, result, status and creation time.
* A direct run has `scenario_id = NULL`.
* A scenario run stores the corresponding `scenario_id`.

### Scenario

* `Scenario` is editable through `POST`, `GET`, `PUT`, `PATCH` and `DELETE`.
* `PUT` replaces all editable fields.
* `PATCH` changes only fields explicitly provided by the client.
* Use `model_dump(exclude_unset=True)` for partial updates.
* Scenario names must be trimmed and must not be empty or whitespace-only.
* Deleting a scenario must not delete historical simulation runs.
* The database relationship must preserve `ON DELETE SET NULL` behavior for `SimulationRun.scenario_id`.
* Copy mutable parameters when creating historical runs so later scenario changes do not modify historical input.

## Database rules

* PostgreSQL is the supported database.
* Do not replace PostgreSQL with SQLite in tests because the models use PostgreSQL JSONB.
* Use Alembic for database-schema changes.
* Do not generate a migration unless the SQLAlchemy model structure actually changes.
* Never reset or delete the development database or Docker volume unless explicitly requested.
* Database write failures must trigger transaction rollback.
* Do not expose database credentials or internal exception details in API responses.

## API behavior

* Use appropriate FastAPI response models.
* Use `201 Created` for newly created resources and simulation runs.
* Use `204 No Content` for successful deletion.
* Use `400` for unsupported operations or protocols where appropriate.
* Use `404` for missing resources.
* Use `422` for invalid request data or invalid protocol parameters.
* Paginated endpoints must enforce:

  * `skip >= 0`
  * `1 <= limit <= 100`

Preserve existing API response shapes unless the task explicitly requires a breaking change.

## Development workflow

Before editing:

1. Read applicable `AGENTS.md` files.
2. Run `git status --short`.
3. Inspect the current files and existing tests.
4. Preserve all unrelated and uncommitted user changes.

During implementation:

* Make focused changes within the requested scope.
* Preserve working behavior.
* Avoid unnecessary abstractions and broad refactors.
* Avoid unrelated dependency upgrades.
* Add or update tests for changed behavior.
* Do not modify frontend files during a backend-only task.
* Do not modify backend files during a frontend-only task unless required by an agreed API change.

Never run destructive Git commands such as:

* `git reset --hard`
* `git checkout --`
* `git clean`
* force push

Do not commit, push, merge or rebase unless explicitly requested.

## Environment and security

* Never commit `.env`.
* Never print or expose real credentials.
* Keep `.env.example` free of real secrets.
* Use environment variables for `DATABASE_URL`, CORS settings and public frontend API URLs.
* Preserve `.gitignore` coverage for virtual environments, caches, build output, `.env`, `node_modules` and `.next`.

## Verification

After backend changes, run the relevant checks:

```bash
cd backend
python -m compileall app tests
pytest -q
```

From the repository root, validate Docker configuration:

```bash
docker compose config
```

When Docker verification is required:

```bash
docker compose up -d --build backend
docker compose exec backend alembic current
```

Verify relevant health endpoints and API routes when the backend is running.

Do not report a check as passing unless it was actually executed. If a check cannot run, report the exact reason and the command the user should run.

## Definition of done

A task is complete when:

* the requested behavior is implemented;
* existing compatible behavior is preserved;
* relevant tests are added or updated;
* tests and available validation commands pass;
* the final diff is reviewed for regressions and unrelated changes;
* documentation is updated when commands, setup or public API behavior changes;
* the final response lists modified files, tests executed, results and unresolved blockers.