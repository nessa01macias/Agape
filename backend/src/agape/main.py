from fastapi import FastAPI

from agape.api import router as api_router

app = FastAPI(title="Agape", version="0.1.0")
app.include_router(api_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
