# Agape backend

Reads a site, plans the edit, renders the video. Node — no build step, the
runtime strips the types.

## Setup

```bash
npm install
cp .env.example .env   # then fill in the keys below
npm run dev            # http://127.0.0.1:8000
```

## Commands

```bash
npm run dev     # watch mode
npm start       # once
npm run lint    # tsc --noEmit
```

## Keys

| Variable | Needed for | Without it |
|---|---|---|
| `FIRECRAWL_API_KEY` | rendered pages, body text, screenshots | falls back to metadata only |
| `MICROLINK_API_KEY` | — | the free tier works with no key |
| `GEMINI_API_KEY` | reading text out of the screenshots | that step is skipped |

## API

```
POST  /api/projects            { url } -> { job_id }
GET   /api/projects/:id/events -> SSE stream of JobEvent
PATCH /api/projects/:id/format { format }

POST  /api/projects/:id/render -> { render_id }
GET   /api/renders/:id         -> { status, progress }
GET   /api/renders/:id/file    -> the MP4
```

The project routes are the contract `frontend/src/lib/jobs.ts` already
speaks, so with this running the frontend stops using its mock and goes
live. There is no flag to flip.

## Layout

```
src/server.ts     routes
src/pipeline.ts   the job: scout -> curator -> strategist -> writer ->
                  director, emitting JobEvents as it goes
src/scrape.ts     reads the site
src/render.ts     Remotion render
```

### Scraping

Three sources, cheapest first. `scrape()` returns `images` and
`screenshots` alongside the brand fields — those URLs are what the vision
step reads text out of.

- **direct** — one fetch + cheerio. Free, no key. Fonts and `theme-color`.
  Blind to anything rendered client-side.
- **microlink** — title, description, hero image, favicon, brand palette.
  Free tier needs no key.
- **firecrawl** — rendered HTML, body text, screenshots. Costs a credit per
  page; `AGAPE_SCREENSHOTS` (default 2) caps shots per job.

Firecrawl screenshot URLs are signed and expire — download them before
persisting anything that points at one.
