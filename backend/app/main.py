from fastapi import FastAPI

from app.api.routes.health import router as health_router
from app.api.routes.simulations import router as simulations_router

app = FastAPI(
    title="InteractiveLab API",
    version="0.1.0",
)

app.include_router(health_router)
app.include_router(simulations_router)


@app.get("/")
def root():
    return {"message": "Hello Interactive Lab"}