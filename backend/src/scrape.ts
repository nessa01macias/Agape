/* ---------------------------------------------------------------
   Agape — read the site
   ---------------------------------------------------------------
   Ported from the Python scraper on feat/link-to-video-scraping, which
   is the better one: Microlink for fast metadata and a brand palette,
   Firecrawl for a rendered pass that actually sees JS-built pages.

   Three sources, in order of cost:

     direct   one fetch + cheerio. Free, no key, gives us fonts and a
              theme-colour. Blind to anything rendered client-side.
     metadata Microlink. Free tier needs no key. Title, description,
              hero image, favicon, and a colour palette.
     deep     Firecrawl. Needs FIRECRAWL_API_KEY and spends a credit.
              Real rendered HTML, body text, and screenshots.

   The first two run together and neither is fatal on its own — a site
   that blocks one usually answers the other. Only if both fail do we
   give up, because at that point we genuinely have nothing to cut.
   --------------------------------------------------------------- */

import * as cheerio from 'cheerio'

export type Scraped = {
  name: string
  domain: string
  accent: string
  tagline: string | null
  description: string | null
  image: string | null
  favicon: string | null
  fonts: string[]
  /** Every image we found, hero first. */
  images: string[]
  /** Body copy worth putting on screen, longest-lived first. */
  textBlocks: string[]
  /**
   * Rendered page shots, landing page first. Firecrawl signs these and
   * they expire — download them before persisting anything that points
   * at one.
   */
  screenshots: string[]
}

export type ScrapeOptions = {
  /** Spend a Firecrawl credit for rendered HTML and body text. */
  full?: boolean
  /** How many rendered shots to capture. Each costs a credit. */
  screenshots?: number
}

export class ScrapeError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ScrapeError'
    this.status = status
  }
}

const DIRECT_TIMEOUT_MS = 12_000
const MICROLINK_TIMEOUT_MS = 10_000
const FIRECRAWL_TIMEOUT_MS = 30_000

const MIN_TEXT_BLOCK_LEN = 40
const MAX_TEXT_BLOCKS = 12
const MAX_IMAGES = 30

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36 Agape/0.1'

/* --- colour ---------------------------------------------------- */

/** Colours too dark, too light or too grey to read as a brand accent. */
function isUsableAccent(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lightness = (max + min) / 2 / 255
  const saturation =
    max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255))

  return saturation > 0.25 && lightness > 0.15 && lightness < 0.9
}

function normaliseHex(raw: string): string | null {
  let hex = raw.trim().toLowerCase()
  if (/^#[0-9a-f]{3}$/.test(hex)) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
  }
  return /^#[0-9a-f]{6}$/.test(hex) ? hex : null
}

/**
 * Best accent available: an explicit `theme-color`, else the most-repeated
 * usable colour in the markup — brands paint their buttons and links the
 * same shade many times over.
 */
function pickAccent($: cheerio.CheerioAPI, html: string): string | null {
  const declared = $('meta[name="theme-color"]').attr('content')
  const fromMeta = declared ? normaliseHex(declared) : null
  if (fromMeta && isUsableAccent(fromMeta)) return fromMeta

  const counts = new Map<string, number>()
  for (const match of html.matchAll(/#[0-9a-fA-F]{3,6}\b/g)) {
    const hex = normaliseHex(match[0])
    if (hex && isUsableAccent(hex)) counts.set(hex, (counts.get(hex) ?? 0) + 1)
  }

  let best: string | null = null
  let bestCount = 0
  for (const [hex, count] of counts) {
    if (count > bestCount) {
      best = hex
      bestCount = count
    }
  }

  return best
}

function pickFonts($: cheerio.CheerioAPI, html: string): string[] {
  const fonts = new Set<string>()

  $('link[href*="fonts.googleapis.com"]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    for (const m of href.matchAll(/family=([^&:]+)/g)) {
      fonts.add(decodeURIComponent(m[1]).replace(/\+/g, ' '))
    }
  })

  for (const m of html.matchAll(
    /font-family:\s*['"]?([A-Za-z][A-Za-z0-9 ]{2,24})['"]?/g,
  )) {
    const name = m[1].trim()
    // `var` is the capture from `font-family: var(--font-geist)`, which is
    // how most modern sites declare type — a custom-property reference
    // tells us nothing, so drop it along with the generic families.
    if (!/^(var|inherit|initial|unset|revert|sans|serif|monospace|system-ui|ui-\w+)$/i.test(name)) {
      fonts.add(name)
    }
  }

  return [...fonts].slice(0, 3)
}

/** Segments that are page furniture rather than anyone's brand. */
const GENERIC_SEGMENT =
  /^(home|homepage|welcome|index|official site|official website)$/i

/**
 * Pulls the brand out of a page title.
 *
 * Titles put the brand on either end — "Acme — the fastest way to X" but
 * also "Home \ Acme" — so taking the first segment is wrong half the time.
 * The domain is the tiebreak: whichever segment looks like the hostname is
 * the brand. Failing that, the first segment that isn't page furniture.
 */
function brandFromTitle(title: string | null, domain: string): string | null {
  if (!title) return null

  const segments = title
    .split(/[|—–·:\\/]|\s-\s/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (!segments.length) return null

  const root = domain.split('.')[0].toLowerCase()
  const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

  const matching = segments.find((s) => squash(s) === root)
  if (matching) return matching

  return segments.find((s) => !GENERIC_SEGMENT.test(s)) ?? segments[0]
}

/* --- sources ---------------------------------------------------- */

type Direct = {
  name: string | null
  title: string | null
  accent: string | null
  fonts: string[]
}

/** One plain fetch. Cheap, keyless, and the only source of fonts. */
async function fetchDirect(url: URL): Promise<Direct> {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(DIRECT_TIMEOUT_MS),
    headers: {
      // Plenty of sites serve a stub to unknown agents.
      'user-agent': USER_AGENT,
      accept: 'text/html,application/xhtml+xml',
    },
  })

  if (!response.ok) {
    throw new ScrapeError(502, `${url.hostname} answered ${response.status}`)
  }

  const html = await response.text()
  const $ = cheerio.load(html)

  const attr = (selector: string) => $(selector).attr('content')?.trim() || null

  return {
    name:
      attr('meta[property="og:site_name"]') ??
      attr('meta[name="application-name"]'),
    title: $('title').first().text().trim() || null,
    accent: pickAccent($, html),
    fonts: pickFonts($, html),
  }
}

type Microlink = {
  title: string | null
  description: string | null
  image: string | null
  favicon: string | null
  accent: string | null
}

function microlinkConfig(): { base: string; headers: Record<string, string> } {
  const key = process.env.MICROLINK_API_KEY
  return key
    ? { base: 'https://pro.microlink.io', headers: { 'x-api-key': key } }
    : { base: 'https://api.microlink.io', headers: {} }
}

async function fetchMicrolink(url: URL): Promise<Microlink> {
  const { base, headers } = microlinkConfig()
  const endpoint = `${base}?url=${encodeURIComponent(url.toString())}&palette=true`

  let response: Response
  try {
    response = await fetch(endpoint, {
      headers,
      signal: AbortSignal.timeout(MICROLINK_TIMEOUT_MS),
    })
  } catch (cause) {
    const timedOut = cause instanceof Error && cause.name === 'TimeoutError'
    throw new ScrapeError(
      timedOut ? 504 : 502,
      timedOut ? 'Timed out reaching that URL' : 'Could not reach that URL',
    )
  }

  if (!response.ok) {
    throw new ScrapeError(502, `Metadata lookup failed (${response.status})`)
  }

  const body = (await response.json()) as {
    status?: string
    data?: Record<string, unknown>
  }
  if (body.status !== 'success') {
    throw new ScrapeError(502, 'Metadata lookup failed')
  }

  const data = body.data ?? {}
  const nested = (key: string): string | null => {
    const value = data[key]
    return value && typeof value === 'object' && 'url' in value
      ? (((value as { url?: unknown }).url as string) ?? null)
      : null
  }

  /*
   * Microlink nests the palette under whatever it sampled — `logo` and
   * `image` — and there is no top-level `data.palette`, so reading one
   * silently yields nothing and the accent falls through to counting hex
   * codes in markup. On Stripe that finds Google blue from an embedded
   * asset. The favicon's palette is the brand's actual ink, so it wins.
   */
  const swatch = (source: unknown): string[] =>
    source && typeof source === 'object' && Array.isArray((source as { palette?: unknown }).palette)
      ? ((source as { palette: unknown[] }).palette.filter(
          (c): c is string => typeof c === 'string',
        ))
      : []

  const palette = [
    ...swatch(data.logo),
    ...swatch(data.image),
    ...(Array.isArray(data.palette)
      ? (data.palette as unknown[]).filter((c): c is string => typeof c === 'string')
      : []),
  ]

  const accent = palette
    .map(normaliseHex)
    .find((hex): hex is string => hex !== null && isUsableAccent(hex))

  return {
    title: typeof data.title === 'string' ? data.title : null,
    description: typeof data.description === 'string' ? data.description : null,
    image: nested('image'),
    favicon: nested('logo'),
    accent: accent ?? null,
  }
}

type Firecrawl = {
  html: string
  markdown: string
  metadata: Record<string, unknown>
  screenshot: string | null
}

async function fetchFirecrawl(
  url: string,
  { screenshot = false, fullPage = true }: { screenshot?: boolean; fullPage?: boolean } = {},
): Promise<Firecrawl> {
  const key = process.env.FIRECRAWL_API_KEY
  if (!key) throw new ScrapeError(500, 'FIRECRAWL_API_KEY is not configured')

  const formats: unknown[] = ['markdown', 'html']
  if (screenshot) formats.push({ type: 'screenshot', fullPage })

  let response: Response
  try {
    response = await fetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ url, formats }),
      signal: AbortSignal.timeout(FIRECRAWL_TIMEOUT_MS),
    })
  } catch (cause) {
    const timedOut = cause instanceof Error && cause.name === 'TimeoutError'
    throw new ScrapeError(
      timedOut ? 504 : 502,
      timedOut ? 'Timed out scraping that page' : 'Could not reach that URL',
    )
  }

  if (!response.ok) {
    throw new ScrapeError(502, `Full-page scrape failed (${response.status})`)
  }

  const body = (await response.json()) as {
    success?: boolean
    error?: string
    data?: Record<string, unknown>
  }
  if (!body.success) {
    throw new ScrapeError(502, body.error || 'Full-page scrape failed')
  }

  const data = body.data ?? {}
  return {
    html: typeof data.html === 'string' ? data.html : '',
    markdown: typeof data.markdown === 'string' ? data.markdown : '',
    metadata: (data.metadata as Record<string, unknown>) ?? {},
    screenshot: typeof data.screenshot === 'string' ? data.screenshot : null,
  }
}

/* --- extraction -------------------------------------------------- */

/**
 * Chrome rather than content: sprites, tracking pixels, UI icons, and
 * vector marks. They're useless as video footage and they're what a page
 * has most of, so an unfiltered list is mostly junk.
 */
const NOT_FOOTAGE =
  /(sprite|pixel|tracking|analytics|badge|avatar|favicon|logo|icon|\.svg(\?|$)|\.gif(\?|$))/i

function imagesFromHtml(html: string): string[] {
  if (!html) return []

  const $ = cheerio.load(html)
  const seen = new Set<string>()
  const images: string[] = []

  $('img').each((_, el) => {
    if (images.length >= MAX_IMAGES) return false
    const el$ = $(el)
    // Lazy-loaded pages keep the real URL in data-src and put a placeholder
    // in src, so preferring src alone collects a wall of blank spacers.
    const src =
      el$.attr('src') || el$.attr('data-src') || el$.attr('data-lazy-src')
    if (!src || !/^https?:\/\//.test(src) || seen.has(src)) return
    if (NOT_FOOTAGE.test(src)) return

    // A declared width under ~200px is an icon whatever it's called.
    const width = Number(el$.attr('width'))
    if (Number.isFinite(width) && width > 0 && width < 200) return

    seen.add(src)
    images.push(src)
  })

  return images
}

function textBlocksFromMarkdown(markdown: string): string[] {
  if (!markdown) return []

  const blocks: string[] = []
  for (const raw of markdown.split(/\n{2,}/)) {
    const text = raw
      .trim()
      .replace(/^#+/, '')
      .trim()
      .replace(/[!\[\]()]|https?:\/\/\S+/g, '')
      .trim()

    if (text.length >= MIN_TEXT_BLOCK_LEN) blocks.push(text)
    if (blocks.length >= MAX_TEXT_BLOCKS) break
  }

  return blocks
}

/**
 * Same-host, shallow-path pages worth shooting alongside the landing page.
 * Firecrawl's map returns whatever it has crawled, which on a big site is
 * mostly deep docs and jobs URLs — we want what looks like a marketing top
 * level. Two segments rather than one, because plenty of sites locale-prefix
 * (stripe.com/nz/pricing).
 */
async function mapSite(url: URL, limit: number): Promise<string[]> {
  const key = process.env.FIRECRAWL_API_KEY
  if (!key) return []

  let response: Response
  try {
    response = await fetch('https://api.firecrawl.dev/v2/map', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ url: url.toString(), limit: 60 }),
      signal: AbortSignal.timeout(FIRECRAWL_TIMEOUT_MS),
    })
  } catch {
    return [] // Extra shots are a bonus; never fail the scrape over them.
  }

  if (!response.ok) return []

  const body = (await response.json()) as { links?: unknown[] }
  const host = url.hostname.replace(/^www\./, '')
  const picked: string[] = []

  for (const link of body.links ?? []) {
    const href =
      typeof link === 'string'
        ? link
        : typeof (link as { url?: unknown })?.url === 'string'
          ? ((link as { url: string }).url)
          : null
    if (!href) continue

    let parts: URL
    try {
      parts = new URL(href)
    } catch {
      continue
    }

    if (parts.hostname.replace(/^www\./, '') !== host) continue
    if (parts.pathname.split('/').filter(Boolean).length > 2) continue
    if (
      href.replace(/\/$/, '') === url.toString().replace(/\/$/, '') ||
      picked.includes(href)
    ) {
      continue
    }

    picked.push(href)
    if (picked.length >= limit) break
  }

  return picked
}

/** One viewport screenshot, or null — a failed extra shot is not fatal. */
async function shoot(target: string): Promise<string | null> {
  try {
    const page = await fetchFirecrawl(target, { screenshot: true, fullPage: false })
    return page.screenshot
  } catch {
    return null
  }
}

/* --- the scrape --------------------------------------------------- */

export async function scrape(
  rawUrl: string,
  { full = false, screenshots = 0 }: ScrapeOptions = {},
): Promise<Scraped> {
  const url = new URL(rawUrl.includes('://') ? rawUrl : `https://${rawUrl}`)
  const domain = url.hostname.replace(/^www\./, '')
  const deep = full || screenshots > 0

  // Neither of these is authoritative on its own — a site that blocks the
  // plain fetch often answers Microlink, and vice versa.
  const [directResult, metaResult] = await Promise.allSettled([
    fetchDirect(url),
    fetchMicrolink(url),
  ])

  const direct = directResult.status === 'fulfilled' ? directResult.value : null
  const meta = metaResult.status === 'fulfilled' ? metaResult.value : null

  if (!direct && !meta && !deep) {
    const reason =
      directResult.status === 'rejected' ? directResult.reason : undefined
    throw reason instanceof ScrapeError
      ? reason
      : new ScrapeError(502, `Couldn't reach ${domain}`)
  }

  const title = meta?.title ?? direct?.title ?? null
  const name = direct?.name || brandFromTitle(title, domain) || domain.split('.')[0]

  const scraped: Scraped = {
    name,
    domain,
    // Microlink's palette is sampled from the rendered page, so it beats
    // counting hex codes in markup. Violet is the product's own fallback.
    accent: meta?.accent ?? direct?.accent ?? '#6c5ce7',
    tagline: title,
    description: meta?.description ?? null,
    image: meta?.image ?? null,
    favicon: meta?.favicon ?? null,
    fonts: direct?.fonts ?? [],
    images: meta?.image ? [meta.image] : [],
    textBlocks: [],
    screenshots: [],
  }

  if (deep) {
    const page = await fetchFirecrawl(url.toString(), {
      screenshot: screenshots > 0,
    })

    for (const img of imagesFromHtml(page.html)) {
      if (!scraped.images.includes(img)) scraped.images.push(img)
    }
    scraped.textBlocks = textBlocksFromMarkdown(page.markdown)

    // Firecrawl's metadata beats Microlink's on some sites — but only fill
    // what the metadata pass left empty.
    const fc = page.metadata
    const str = (key: string) =>
      typeof fc[key] === 'string' ? (fc[key] as string) : null

    scraped.tagline ??= str('title')
    scraped.description ??= str('description')
    scraped.image ??= str('ogImage')

    if (page.screenshot) scraped.screenshots.push(page.screenshot)
  }

  // Remaining shots come from other top-level pages, in parallel.
  const wanted = screenshots - scraped.screenshots.length
  if (wanted > 0) {
    const extra = await mapSite(url, wanted)
    if (extra.length) {
      const shots = await Promise.all(extra.map(shoot))
      scraped.screenshots.push(...shots.filter((s) => s !== null))
    }
  }

  return scraped
}
