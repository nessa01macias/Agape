# Agape backend

FastAPI backend for the AI video editor.

## Setup

```bash
uv sync
```

## Commands

```bash
uv run uvicorn agape.main:app --reload   # dev server -> http://127.0.0.1:8000
uv run pytest                            # tests
uv run ruff check .                      # lint
uv add <package>                         # add a dependency
```

## requirements.txt

`pyproject.toml` + `uv.lock` are the source of truth. `requirements.txt` and
`requirements-dev.txt` are generated artifacts, kept only for tooling that
expects them (some PaaS builders, Docker images, CI without uv). Regenerate
after any dependency change:

```bash
uv export --no-hashes --no-dev   --no-emit-project -o requirements.txt
uv export --no-hashes --only-dev --no-emit-project -o requirements-dev.txt
```

Interactive API docs at `/docs` once the server is running.

## Layout

```
src/agape/   application code (main.py holds the FastAPI app)
tests/       tests
```

Copy `.env.example` to `.env` for local secrets.
