# Agape frontend

React + Vite + TypeScript. Holds the marketing page, the pipeline screen,
and the editor — plus the Remotion composition the video is actually made of.

```bash
npm install
npm run dev        # http://127.0.0.1:5173
```

`/api` is proxied to the backend on port 8000 (see `vite.config.ts`).

## The flow

```
/                     Landing — Hero takes a URL
  ↓  /pipeline?url=…  Runs the job, narrates it, hands off when the cut is ready
  ↓  /editor?url=…    Remotion Player + the artifacts that fed it
```

Both `/pipeline` and `/editor` start the job themselves from the `url`
query param, so either is safe to reload or share.

## Layout

```
src/components/   landing sections
src/pages/        Landing · Pipeline · Editor
src/hooks/useJob  runs a job, folds the event stream into state
src/lib/jobs.ts   the API contract (POST /api/projects + SSE)
src/lib/mockJob   scripted stand-in used until the backend answers
src/lib/brand.ts  brand guessed from the URL — the fallback, not the product
src/remotion/     the composition: Scene, Phone, Titles
```

`useJob` is the only thing that talks to `jobs.ts`; the pipeline screen and
the editor both read from it, so they can't drift apart.

## Mock vs live

`createProject` always tries the real endpoint first. Until the backend
answers it falls back to `mockJob.ts` and the editor shows a `mock` pill.
No flag to flip — the day the endpoint works, the mock stops being used.

## Remotion

The composition is registered in `src/remotion/index.ts` (the entry point
`remotion.config.ts` points at).

```bash
npm run studio     # Remotion Studio
npm run render     # -> out/launch.mp4

# custom brand:
npx remotion render Scene out/launch.mp4 \
  --props='{"brandName":"linear","domain":"linear.app","accent":"#0984E3"}'
```

Rendering from the app ("Export MP4") is still disabled — it needs a Node
render service, since `@remotion/renderer` can't run under the Python
backend. That decision is open.

## Checks

```bash
npm run lint       # oxlint
npx tsc -b         # types
npm run build
```
