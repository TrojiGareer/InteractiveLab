from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.health import (
    router as health_router,
)
from app.api.routes.protocols import (
    router as protocols_router,
)
from app.api.routes.scenarios import (
    router as scenarios_router,
)
from app.api.routes.simulations import (
    router as simulations_router,
)
from app.core.config import settings


app = FastAPI(
    title="InteractiveLab API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(protocols_router)
app.include_router(scenarios_router)
app.include_router(simulations_router)


@app.get("/")
def root():
    return {
        "message": "Hello Interactive Lab"
    }