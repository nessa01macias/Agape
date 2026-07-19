/* ---------------------------------------------------------------
   Agape — read the site
   ---------------------------------------------------------------
   Pulls the few things the video actually needs: what the product is
   called, what colour it uses, what it says about itself. Deliberately
   shallow — one request, no JS execution. Sites that render everything
   client-side will give us thin results, and that's the honest outcome
   until we put a headless browser behind this.
   --------------------------------------------------------------- */

import * as cheerio from 'cheerio'

export type Scraped = {
  name: string
  domain: string
  accent: string
  tagline: string | null
  description: string | null
  image: string | null
  fonts: string[]
}

export class ScrapeError extends Error {}

const TIMEOUT_MS = 12_000

/** Colours too dark, too light or too grey to read as a brand accent. */
function isUsableAccent(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lightness = (max + min) / 2 / 255
  const saturation = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255))

  return saturation > 0.25 && lightness > 0.15 && lightness < 0.9
}

function normaliseHex(raw: string): string | null {
  let hex = raw.toLowerCase()
  if (/^#[0-9a-f]{3}$/.test(hex)) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
  }
  return /^#[0-9a-f]{6}$/.test(hex) ? hex : null
}

/**
 * Best accent we can find: an explicit `theme-color` if the site sets one,
 * otherwise the most-repeated usable colour in the markup — brands tend to
 * paint their buttons and links the same shade many times over.
 */
function pickAccent($: cheerio.CheerioAPI, html: string): string {
  const declared = $('meta[name="theme-color"]').attr('content')
  const fromMeta = declared ? normaliseHex(declared.trim()) : null
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

  // Nothing legible on the page — fall back to the product's own violet.
  return best ?? '#6c5ce7'
}

function pickFonts($: cheerio.CheerioAPI, html: string): string[] {
  const fonts = new Set<string>()

  $('link[href*="fonts.googleapis.com"]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    for (const m of href.matchAll(/family=([^&:]+)/g)) {
      fonts.add(decodeURIComponent(m[1]).replace(/\+/g, ' '))
    }
  })

  for (const m of html.matchAll(/font-family:\s*['"]?([A-Za-z][A-Za-z0-9 ]{2,24})['"]?/g)) {
    const name = m[1].trim()
    if (!/^(inherit|initial|sans|serif|monospace|system-ui)$/i.test(name)) fonts.add(name)
  }

  return [...fonts].slice(0, 3)
}

export async function scrape(rawUrl: string): Promise<Scraped> {
  const url = new URL(rawUrl.includes('://') ? rawUrl : `https://${rawUrl}`)
  const domain = url.hostname.replace(/^www\./, '')

  let html: string
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        // Plenty of sites serve a stub to unknown agents.
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36 Agape/0.1',
        accept: 'text/html,application/xhtml+xml',
      },
    })

    if (!response.ok) {
      throw new ScrapeError(`${domain} answered ${response.status}`)
    }
    html = await response.text()
  } catch (cause) {
    if (cause instanceof ScrapeError) throw cause
    const reason = cause instanceof Error ? cause.message : String(cause)
    throw new ScrapeError(`Couldn't reach ${domain} — ${reason}`)
  }

  const $ = cheerio.load(html)

  const meta = (selector: string, attr = 'content') =>
    $(selector).attr(attr)?.trim() || null

  const siteName =
    meta('meta[property="og:site_name"]') ??
    meta('meta[name="application-name"]') ??
    null

  const title = $('title').first().text().trim() || null

  // "Acme — the fastest way to X" → "Acme"
  const fromTitle = title ? title.split(/[|—–·:-]/)[0].trim() : null

  const name = siteName || fromTitle || domain.split('.')[0]

  return {
    name,
    domain,
    accent: pickAccent($, html),
    tagline: meta('meta[property="og:title"]') ?? title,
    description:
      meta('meta[name="description"]') ?? meta('meta[property="og:description"]'),
    image: meta('meta[property="og:image"]'),
    fonts: pickFonts($, html),
  }
}
