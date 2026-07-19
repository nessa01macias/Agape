/* ---------------------------------------------------------------
   Agape — planning the edit
   ---------------------------------------------------------------
   Hands the scraped site to Gemini and gets back a shot list.

   The screenshots are the point. Metadata tells the model what the
   product *claims* to be; the rendered page tells it what the product
   looks like — which is what we're actually cutting. Gemini takes image
   bytes rather than URLs, so shots are downloaded here before the call.

   Every failure path falls back to a scripted plan. A missing key, a
   quota wall, or a malformed response should cost us the AI plan, not
   the video.
   --------------------------------------------------------------- */

import { GoogleGenAI, Type } from '@google/genai'
import type { Scraped } from './scrape.ts'

/**
 * Pro is quota-blocked on the free tier (`limit: 0`), so flash is the
 * real default rather than a cost compromise. Override per-deployment.
 */
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash'

/** Matches the Remotion composition — the plan has to fit the cut. */
const FPS = 30
const TOTAL_FRAMES = 210

/** Each shot costs input tokens; the landing page carries most of the signal. */
const MAX_SHOTS_TO_SEND = 3
const IMAGE_TIMEOUT_MS = 15_000
const MAX_IMAGE_BYTES = 6 * 1024 * 1024

export type Shot = {
  title: string
  description: string
  durationInFrames: number
}

/**
 * The three writable text slots in the composition. Everything else on
 * screen (the brand name, the domain pill) comes from the scrape, so
 * these are the only lines the model actually gets to author.
 */
export type Titles = {
  /** Small accent line above the brand name. */
  eyebrow: string
  /** One line under the brand name. */
  tagline: string
  /** The line across the bottom of the phone screen. */
  footer: string
}

export type VideoPlan = {
  format: string
  reason: string
  accent: string
  titles: Titles
  /** The same three lines, in render order — this is what the UI streams. */
  script: string[]
  shots: Shot[]
  /** False when this is the scripted fallback rather than a real plan. */
  fromModel: boolean
}

const planSchema = {
  type: Type.OBJECT,
  properties: {
    format: {
      type: Type.STRING,
      description:
        'The cut you chose, as a short label with duration and aspect — e.g. "Launch teaser — 7s, 16:9".',
    },
    reason: {
      type: Type.STRING,
      description:
        'One sentence, grounded in what you saw on their page, on why this format suits this product.',
    },
    accent: {
      type: Type.STRING,
      description:
        'The brand accent colour as #rrggbb, read off the screenshots. Pick the colour a viewer would name as "theirs" — not a background grey or near-black.',
    },
    titles: {
      type: Type.OBJECT,
      description:
        'The three lines of on-screen text. The brand name and domain are already on screen — do not repeat them here.',
      properties: {
        eyebrow: {
          type: Type.STRING,
          description:
            'Two or three words above the brand name, uppercase — e.g. "INTRODUCING", "NOW LIVE", "MEET". Not a sentence.',
        },
        tagline: {
          type: Type.STRING,
          description:
            'One line under the brand name: what this product does for someone, in eight words or fewer. Plain language, no buzzwords, no trailing period.',
        },
        footer: {
          type: Type.STRING,
          description:
            'Two or three words across the bottom of a phone screen, uppercase — e.g. "LAUNCHING SOON", "OUT NOW", "JOIN THE BETA".',
        },
      },
      required: ['eyebrow', 'tagline', 'footer'],
      propertyOrdering: ['eyebrow', 'tagline', 'footer'],
    },
    shots: {
      type: Type.ARRAY,
      description: `Three shots. durationInFrames must sum to ${TOTAL_FRAMES} at ${FPS}fps.`,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: 'Four words or fewer.' },
          description: { type: Type.STRING, description: 'One sentence on what is on screen.' },
          durationInFrames: { type: Type.INTEGER },
        },
        required: ['title', 'description', 'durationInFrames'],
        propertyOrdering: ['title', 'description', 'durationInFrames'],
      },
    },
  },
  required: ['format', 'reason', 'accent', 'titles', 'shots'],
  propertyOrdering: ['format', 'reason', 'accent', 'titles', 'shots'],
}

function systemPrompt(): string {
  return [
    'You are the director on a team that turns a company website into a short launch video.',
    `The finished cut is ${TOTAL_FRAMES} frames at ${FPS}fps — exactly ${TOTAL_FRAMES / FPS} seconds.`,
    'You are given a company\'s metadata and, when available, rendered screenshots of their actual pages.',
    'Ground every choice in what you can see. Do not invent product features, customers, or claims.',
    'If the screenshots and the metadata disagree, trust the screenshots — they are the live page.',
    'Write on-screen titles, not voiceover: short, concrete, no marketing filler.',
  ].join(' ')
}

function brief(site: Scraped): string {
  const lines = [
    `Company: ${site.name}`,
    `Domain: ${site.domain}`,
    site.tagline ? `Page title: ${site.tagline}` : null,
    site.description ? `Description: ${site.description}` : null,
    site.fonts.length ? `Typefaces detected: ${site.fonts.join(', ')}` : null,
    `Accent guessed from markup (may be wrong — correct it from the shots): ${site.accent}`,
  ].filter(Boolean)

  if (site.textBlocks.length) {
    lines.push('', 'Copy lifted from the page:')
    for (const block of site.textBlocks.slice(0, 8)) {
      lines.push(`- ${block.slice(0, 200)}`)
    }
  }

  return lines.join('\n')
}

/** Downloads one screenshot. Returns null rather than failing the plan. */
async function fetchImage(
  url: string,
): Promise<{ mimeType: string; data: string } | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS) })
    if (!response.ok) return null

    const buffer = Buffer.from(await response.arrayBuffer())
    if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) return null

    const mimeType = response.headers.get('content-type')?.split(';')[0] ?? 'image/png'
    if (!mimeType.startsWith('image/')) return null

    return { mimeType, data: buffer.toString('base64') }
  } catch {
    return null
  }
}

const HEX = /^#[0-9a-f]{6}$/i

/**
 * The model is asked for a well-formed plan, but a plan that renders is
 * our problem, not its. Clamp everything the composition depends on.
 */
function coerce(raw: unknown, site: Scraped): VideoPlan | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>

  const t = (p.titles ?? {}) as Record<string, unknown>
  const line = (v: unknown, fallback: string) =>
    typeof v === 'string' && v.trim() ? v.trim() : fallback

  const titles: Titles = {
    eyebrow: line(t.eyebrow, 'INTRODUCING').toUpperCase().slice(0, 24),
    tagline: line(t.tagline, 'Something big is coming.').slice(0, 72),
    footer: line(t.footer, 'LAUNCHING SOON').toUpperCase().slice(0, 24),
  }

  const shots = Array.isArray(p.shots)
    ? p.shots
        .filter((s): s is Record<string, unknown> => Boolean(s) && typeof s === 'object')
        .map((s) => ({
          title: typeof s.title === 'string' ? s.title : 'Shot',
          description: typeof s.description === 'string' ? s.description : '',
          durationInFrames:
            typeof s.durationInFrames === 'number' && s.durationInFrames > 0
              ? Math.round(s.durationInFrames)
              : 0,
        }))
        .slice(0, 5)
    : []

  if (!shots.length) return null

  // Durations must land on exactly TOTAL_FRAMES or the cut runs long or
  // short; rescale rather than reject an otherwise good plan.
  const sum = shots.reduce((n, s) => n + s.durationInFrames, 0)
  if (sum !== TOTAL_FRAMES) {
    const scale = sum > 0 ? TOTAL_FRAMES / sum : 0
    let used = 0
    shots.forEach((shot, i) => {
      shot.durationInFrames =
        i === shots.length - 1
          ? TOTAL_FRAMES - used
          : Math.max(1, Math.round(shot.durationInFrames * scale))
      used += shot.durationInFrames
    })
  }

  const accent = typeof p.accent === 'string' && HEX.test(p.accent.trim())
    ? p.accent.trim().toLowerCase()
    : site.accent

  return {
    format: typeof p.format === 'string' && p.format ? p.format : 'Launch teaser — 7s, 16:9',
    reason: typeof p.reason === 'string' ? p.reason : '',
    accent,
    titles,
    script: [titles.eyebrow, titles.tagline, titles.footer],
    shots,
    fromModel: true,
  }
}

/** The plan we ship when the model is unavailable or unusable. */
export function fallbackPlan(site: Scraped): VideoPlan {
  const fallbackTitles: Titles = {
    eyebrow: 'INTRODUCING',
    // Their own words beat ours when we have them.
    tagline:
      site.description?.split(/[.!?]/)[0]?.trim().slice(0, 72) ||
      'Something big is coming.',
    footer: 'LAUNCHING SOON',
  }
  return {
    format: 'Launch teaser — 7s, 16:9',
    reason:
      'The site leads with a product shot and a single call to action, so a short teaser lands harder than a walkthrough.',
    accent: site.accent,
    titles: fallbackTitles,
    script: [fallbackTitles.eyebrow, fallbackTitles.tagline, fallbackTitles.footer],
    shots: [
      { title: 'Phone rises out of the dark', description: '', durationInFrames: 70 },
      { title: 'Brand screen resolves', description: '', durationInFrames: 70 },
      { title: 'Title card + domain', description: '', durationInFrames: 70 },
    ],
    fromModel: false,
  }
}

export type PlanLogger = (message: string) => void

export type InlineImage = { mimeType: string; data: string }

/**
 * Downloads the page shots for a scrape. Split out so the eval harness
 * can cache them — Firecrawl's URLs are signed and expire, which would
 * otherwise make a saved fixture useless within the hour.
 */
export async function loadShots(site: Scraped): Promise<InlineImage[]> {
  const shots = site.screenshots.slice(0, MAX_SHOTS_TO_SEND)
  return (await Promise.all(shots.map(fetchImage))).filter((i) => i !== null)
}

/**
 * Plans the cut. Never throws — a failed plan degrades to `fallbackPlan`
 * so the pipeline still produces a video.
 *
 * `cached` lets the eval harness supply already-downloaded shots; the
 * production path leaves it undefined and fetches them here.
 */
export async function planVideo(
  site: Scraped,
  log: PlanLogger = () => {},
  cached?: InlineImage[],
): Promise<VideoPlan> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    log('No GEMINI_API_KEY — using the scripted plan')
    return fallbackPlan(site)
  }

  const images = cached ?? (await loadShots(site))

  log(
    images.length
      ? `Sending ${images.length} page shot${images.length > 1 ? 's' : ''} to ${MODEL}`
      : `No shots to look at — planning ${site.domain} from metadata alone`,
  )

  try {
    const ai = new GoogleGenAI({ apiKey })

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            ...images.map((image) => ({ inlineData: image })),
            { text: `${brief(site)}\n\nPlan the cut.` },
          ],
        },
      ],
      config: {
        systemInstruction: systemPrompt(),
        responseMimeType: 'application/json',
        responseSchema: planSchema,
      },
    })

    const text = response.text
    if (!text) throw new Error('empty response')

    const plan = coerce(JSON.parse(text), site)
    if (!plan) throw new Error('plan missing shots')

    log(`${MODEL} chose: ${plan.format}`)
    return plan
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause)
    // Quota walls and malformed plans are both routine; neither should
    // cost the user their video.
    log(`Planning fell back to the scripted cut — ${reason.slice(0, 120)}`)
    return fallbackPlan(site)
  }
}
