# Agape

**An agentic AI video editor.** Describe the edit in plain language — it does the work.

---

## Why

Startups need video constantly. The launch teaser. The demo walkthrough. Twelve
ad variants because you don't know which hook lands. The founder clip for
LinkedIn. Investor updates. Something for TikTok, but vertical, but shorter, but
with captions this time.

And it always lands the same way: it's Thursday, the thing ships Monday, nobody
owns video, and someone opens a timeline editor at 11pm to nudge keyframes
around. The bottleneck was never taste or ideas — it's that turning "cut the
dead air and add captions" into an actual rendered file takes hours of clicking.

So don't click. Just say it.

> *"Trim the first 20 seconds, speed up the middle, caption it, make a vertical
> cut for Stories."*

Agape plans the edit, shows you what it's about to do, and renders it. You stay
in charge — it proposes, you approve.

## Status

🚧 **Early.** The scaffolding is in place; the editor is being built. Expect
things to move around.

## Repo

```
backend/    Python + FastAPI  — reads the site, plans the edit
frontend/   React + Vite + TS — landing, pipeline screen, editor,
                                and the Remotion composition itself
```

The flow is one URL, carried the whole way:

```
/                     paste a website
/pipeline?url=…       the agents read it — you watch them work
/editor?url=…         the cut, playing, with everything that fed it
```

Until the backend answers, the frontend falls back to a scripted mock
stream, so the whole flow is demoable today. See
[`frontend/README.md`](frontend/README.md).

> **Open decision:** rendering an MP4 needs Node — `@remotion/renderer`
> has no Python equivalent — so the backend language is unsettled.

## Quickstart

Requires [uv](https://docs.astral.sh/uv/), Node, and `ffmpeg` on your PATH.

```bash
# backend -> http://127.0.0.1:8000  (docs at /docs)
cd backend
cp .env.example .env     # add your ANTHROPIC_API_KEY
uv sync
uv run uvicorn agape.main:app --reload

# frontend -> http://127.0.0.1:5173
cd frontend
npm install
npm run dev
```

Per-project details live in [`backend/README.md`](backend/README.md) and
[`frontend/README.md`](frontend/README.md).
