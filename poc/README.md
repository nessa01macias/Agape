# Agape

AI Video Editor — turn a website URL into a launch video in seconds.

Built on [Remotion](https://remotion.dev) + `@remotion/three` (React Three Fiber).

## Run

```bash
npm i
npm run dev        # web app at http://localhost:5173
```

- `/` — landing: enter a website URL
- `/editor` — editor with the generated 3D launch animation (Remotion Player)

## Render / Studio

```bash
npm run studio     # Remotion Studio for the composition
npm run render     # render out/launch.mp4
# custom brand:
npx remotion render Scene out/launch.mp4 --props='{"brandName":"linear","domain":"linear.app","accent":"#0984E3"}'
```

## Structure

- `src/pages/Landing.tsx` — URL input popup
- `src/pages/Editor.tsx` — minimal editor with `@remotion/player`
- `src/remotion/Scene.tsx` — launch composition (3D phone + titles)
- `src/remotion/Phone.tsx` — three-fiber phone mockup, brand screen drawn to canvas texture
- `src/remotion/Titles.tsx` — animated text overlays
