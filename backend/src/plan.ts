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

/** Matches frontend/src/remotion/constants.ts — a 12s, five-shot cut. */
const FPS = 30
const TOTAL_FRAMES = 360

/**
 * The template's shots are fixed in length, so the model writes copy for
 * each rather than choosing durations. Ids mirror `SHOTS` in constants.ts.
 */
const SHOT_BRIEFS = [
  ['hook', 'Opens cold on a single provocative line. No brand yet.'],
  ['intro', 'The brand name lands.'],
  ['product', 'Their actual product, shown on screen.'],
  ['payoff', 'The promise, stated plainly.'],
  ['lockup', 'Brand, domain, and the call to action.'],
] as const

/** Each shot costs input tokens; the landing page carries most of the signal. */
const MAX_SHOTS_TO_SEND = 3
const IMAGE_TIMEOUT_MS = 15_000
const MAX_IMAGE_BYTES = 6 * 1024 * 1024

export type Shot = {
  /** One of the ids in `SHOTS` — hook, intro, product, payoff, lockup. */
  id: string
  title: string
}

/**
 * The three writable text slots in the composition. Everything else on
 * screen (the brand name, the domain pill) comes from the scrape, so
 * these are the only lines the model actually gets to author.
 */
export type Titles = {
  /** Shot 1. Opens the film before the brand appears. */
  headline: string
  /** Shot 4. The promise, once the product has been shown. */
  tagline: string
  /** Shot 5. What the viewer should do next. */
  cta: string
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
        'The brand accent colour as #rrggbb, read off the screenshots. Pick the colour a viewer would name as "theirs" — look at their primary buttons, links, logo mark, and highlights, not at the page background. A dark page usually still has a real accent somewhere; find it rather than defaulting to a neutral. This colour is drawn as small text and a dot on a near-black stage, so it must be bright enough to read there: never black, near-black, or a dark grey. Answer #fafafa only when the brand genuinely has no colour at all — a strictly black-and-white identity with no coloured button, link, or logo anywhere on the page.',
    },
    titles: {
      type: Type.OBJECT,
      description:
        'The three lines of on-screen copy. The brand name and domain appear on their own — never repeat them here.',
      properties: {
        headline: {
          type: Type.STRING,
          description:
            'Shot 1, before the brand is named. One sentence that would make their customer keep watching — the problem they feel, or the change this product makes. Under nine words. Do not name the company.',
        },
        tagline: {
          type: Type.STRING,
          description:
            'Shot 4, after the product has been shown. What it does for someone, in eight words or fewer. Plain language, no buzzwords, no trailing period.',
        },
        cta: {
          type: Type.STRING,
          description:
            'Shot 5. What the viewer should do next, in two to four words — e.g. "Start for free", "Get the app", "Book a demo". Sentence case. Use the wording on their own primary button when the screenshots show one.',
        },
      },
      required: ['headline', 'tagline', 'cta'],
      propertyOrdering: ['headline', 'tagline', 'cta'],
    },
    shots: {
      type: Type.ARRAY,
      description:
        `Exactly five entries, one per shot, in this order: ${SHOT_BRIEFS.map(([id, brief]) => `${id} (${brief})`).join(' ')} Lengths are fixed by the template — you are naming the shots, not timing them.`,
      items: {
        type: Type.OBJECT,
        properties: {
          id: {
            type: Type.STRING,
            description: `One of: ${SHOT_BRIEFS.map(([id]) => id).join(', ')}.`,
          },
          title: {
            type: Type.STRING,
            description: 'What happens in this shot. Four words or fewer, sentence case.',
          },
        },
        required: ['id', 'title'],
        propertyOrdering: ['id', 'title'],
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
    `The cut has five fixed shots: ${SHOT_BRIEFS.map(([id, brief]) => `${id} — ${brief}`).join(' ')}`,
    'Shot 3 shows a real screenshot of their site, so the copy around it should not describe the interface in words.',
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

/** Perceived brightness, 0–1. Weighted for how the eye reads each channel. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function saturation(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  return max === 0 ? 0 : (max - min) / max
}

/**
 * The accent is drawn as text and as a small dot on a near-black stage,
 * so a dark answer renders as nothing at all. Monochrome brands are the
 * common case — Vercel's honest accent is #000000, which would be
 * invisible — and for those the brand reads as white on dark. Anything
 * else dark just gets lifted until it's legible.
 */
function legibleAccent(hex: string): string {
  if (luminance(hex) >= 0.18) return hex

  // Greyscale brand: on this background their colour *is* white.
  if (saturation(hex) < 0.15) return '#fafafa'

  // Saturated but dark — keep the hue, raise it until it reads.
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const peak = Math.max(...channels, 1)
  const scale = Math.min(255 / peak, 0.55 / Math.max(luminance(hex), 0.01))
  return (
    '#' +
    channels
      .map((c) => Math.round(Math.min(255, c * scale)).toString(16).padStart(2, '0'))
      .join('')
  )
}

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
    headline: line(t.headline, 'Your launch deserves better.').slice(0, 80),
    tagline: line(t.tagline, 'Something big is coming.').slice(0, 72),
    cta: line(t.cta, 'Get early access').slice(0, 32),
  }

  // The template renders five fixed shots by id, so build the list from
  // the ids rather than from whatever order the model returned. A missing
  // or misnamed entry falls back to the brief instead of dropping a shot.
  const byId = new Map<string, string>()
  if (Array.isArray(p.shots)) {
    for (const raw of p.shots) {
      if (!raw || typeof raw !== 'object') continue
      const shot = raw as Record<string, unknown>
      if (typeof shot.id === 'string' && typeof shot.title === 'string' && shot.title.trim()) {
        byId.set(shot.id.trim().toLowerCase(), shot.title.trim().slice(0, 40))
      }
    }
  }
  if (!byId.size) return null

  const shots: Shot[] = SHOT_BRIEFS.map(([id, brief]) => ({
    id,
    title: byId.get(id) ?? brief,
  }))

  const chosen =
    typeof p.accent === 'string' && HEX.test(p.accent.trim())
      ? p.accent.trim().toLowerCase()
      : site.accent
  const accent = legibleAccent(chosen)

  return {
    format: typeof p.format === 'string' && p.format ? p.format : 'Launch film — 12s, 16:9',
    reason: typeof p.reason === 'string' ? p.reason : '',
    accent,
    titles,
    script: [titles.headline, titles.tagline, titles.cta],
    shots,
    fromModel: true,
  }
}

/** The plan we ship when the model is unavailable or unusable. */
export function fallbackPlan(site: Scraped): VideoPlan {
  const titles: Titles = {
    headline: 'Your launch deserves better.',
    // Their own words beat ours when we have them.
    tagline:
      site.description?.split(/[.!?]/)[0]?.trim().slice(0, 72) ||
      'Something big is coming.',
    cta: 'Get early access',
  }

  return {
    format: 'Launch film — 12s, 16:9',
    reason:
      'The site leads with a product shot and a single call to action, so a short launch film lands harder than a walkthrough.',
    accent: legibleAccent(site.accent),
    titles,
    script: [titles.headline, titles.tagline, titles.cta],
    shots: SHOT_BRIEFS.map(([id, brief]) => ({ id, title: brief })),
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
