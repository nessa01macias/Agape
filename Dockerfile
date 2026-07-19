# Agape — one Cloud Run service: the API, the Remotion renderer, and the
# built frontend, all on one origin.
#
# Build context is the REPO ROOT, not backend/. The backend bundles the
# Remotion composition straight from the frontend's source
# (backend/src/render.ts -> ../../frontend/src/remotion/index.ts), so both
# workspaces have to be in the image.
#
#   docker build -t agape .
#   docker run -p 8080:8080 -e FIRECRAWL_API_KEY=... -e GEMINI_API_KEY=... agape

# --- stage 1: build the SPA -------------------------------------------
# Needs devDependencies (vite, typescript), which the runtime image does
# not, so it happens here and only `dist` is carried forward.
FROM node:24-bookworm-slim AS web

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build


# --- stage 2: the service ---------------------------------------------
FROM node:24-bookworm-slim

# Chrome's runtime libraries. @remotion/renderer drives a real headless
# Chrome to rasterise the three.js scene; without these it fails to launch.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
      fonts-liberation \
      libasound2 \
      libatk-bridge2.0-0 \
      libatk1.0-0 \
      libcairo2 \
      libcups2 \
      libdbus-1-3 \
      libdrm2 \
      libexpat1 \
      libgbm1 \
      libglib2.0-0 \
      libnspr4 \
      libnss3 \
      libpango-1.0-0 \
      libx11-6 \
      libxcb1 \
      libxcomposite1 \
      libxdamage1 \
      libxext6 \
      libxfixes3 \
      libxkbcommon0 \
      libxrandr2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Manifests first so a source-only change doesn't reinstall the world.
COPY backend/package.json backend/package-lock.json backend/
COPY frontend/package.json frontend/package-lock.json frontend/

# Both workspaces are runtime dependencies here: the backend serves the
# API, and the frontend's packages (remotion, three, @react-three/fiber,
# @remotion/google-fonts) are what the composition imports when webpack
# bundles it at render time. Everything either one needs is a
# `dependency`, so dev deps stay out.
RUN npm --prefix backend  ci --omit=dev \
 && npm --prefix frontend ci --omit=dev

COPY backend/  backend/
COPY frontend/ frontend/

# The SPA, built in stage 1. server.ts serves this when it exists.
COPY --from=web /app/frontend/dist frontend/dist

# Bake Chrome into the image. Cloud Run's filesystem is memory-backed, so
# downloading this at runtime would cost RAM and repeat on every cold
# start — and fail outright if egress is restricted.
RUN cd backend \
 && node --input-type=module -e "import('@remotion/renderer').then(m => m.ensureBrowser())"

ENV NODE_ENV=production
# MP4s go to /tmp — see the note on OUT_DIR in backend/src/render.ts.
ENV AGAPE_OUT_DIR=/tmp/renders
# Cloud Run overrides this; the default keeps `docker run` predictable.
ENV PORT=8080
EXPOSE 8080

WORKDIR /app/backend
CMD ["npm", "start"]
