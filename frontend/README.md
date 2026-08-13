# InteractiveLab frontend

The frontend is an interactive view of the backend's TCP three-way handshake simulator and saved scenario library. FastAPI remains the source of truth for TCP parameter defaults and limits, simulation results, and persisted history.

## Routes

- `/` - configure and run a direct TCP three-way-handshake simulation;
- `/scenarios` - save, edit, run, and delete reusable TCP parameter sets;
- `/simulations` - inspect immutable simulation history and replay its handshake trace.

Running a saved scenario creates a new immutable simulation run. Deleting a scenario removes only its editable configuration: existing historical runs remain available and lose their scenario association.

## Handshake playback

Every completed TCP run can be played step by step as SYN, SYN + ACK, and ACK. The frontend has Play trace, Pause, Resume, Restart, and replay controls; replay uses the saved run snapshot and does not request or persist another simulation.

- **Demo time** uses a readable 700 ms presentation duration for each packet hop.
- **Real time** uses the simulated event timings returned by the API (or the saved latency snapshot when timing is unavailable).

The displayed **Simulated total time** always comes from the backend result, so Demo time never changes TCP values, timestamps, or persisted data. The direct simulator also includes local Client and Server host-appearance selectors. Those choices are visual-only, are not stored in local storage, and are never sent to the API.

## Environment

`NEXT_PUBLIC_API_URL` is required when the API is not served from `http://localhost:8000`. It defaults to that local URL, and must be set to the public API URL before a cloud build.

## Run the complete stack with Docker

From the repository root:

```bash
cp .env.example .env
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). The API is available at [http://localhost:8000](http://localhost:8000), and its documentation is at [http://localhost:8000/docs](http://localhost:8000/docs).

## Frontend-only development

Use Node.js 22, start the backend and database, then run this from `frontend/`:

```bash
npm ci
npm run dev
```

The backend allows the local frontend origins through `CORS_ORIGINS` in `docker-compose.yml`.

## Validation

From `frontend/`:

```bash
npm run lint
npm run test
npm run build
```

The frontend tests use Node 22's native TypeScript test runner and cover API client failures and 204 responses, scenario API workflows, protocol-driven parameter defaults and validation, trace playback, and deletion pagination boundaries.
