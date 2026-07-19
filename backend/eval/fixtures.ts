/* ---------------------------------------------------------------
   Agape — planner fixtures
   ---------------------------------------------------------------
   Scrapes a spread of sites once and caches the result, screenshots
   included, so prompt iteration costs nothing.

   Scraping is the slow, metered half of the pipeline: ~15s and a
   Firecrawl credit per site, and the screenshot URLs are signed and
   expire within the hour. Caching the downloaded bytes means a fixture
   stays usable tomorrow.

     node --env-file-if-exists=.env eval/fixtures.ts          # build cache
     node --env-file-if-exists=.env eval/fixtures.ts --force  # re-scrape
   --------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { scrape, type Scraped } from '../src/scrape.ts'
import { loadShots, type InlineImage } from '../src/plan.ts'

const here = path.dirname(fileURLToPath(import.meta.url))
export const CACHE_DIR = path.resolve(here, 'fixtures')

/** Deliberately varied — a monochrome brand, a loud one, a plain one. */
export const SITES = [
  'linear.app',
  'stripe.com',
  'vercel.com',
  'basecamp.com',
  'anthropic.com',
  'duolingo.com',
]

export type Fixture = {
  site: string
  scraped: Scraped
  images: InlineImage[]
}

const fileFor = (site: string) => path.join(CACHE_DIR, `${site.replace(/\W+/g, '_')}.json`)

export function loadFixtures(): Fixture[] {
  if (!fs.existsSync(CACHE_DIR)) return []
  return fs
    .readdirSync(CACHE_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(CACHE_DIR, f), 'utf8')) as Fixture)
}

async function build(force: boolean): Promise<void> {
  fs.mkdirSync(CACHE_DIR, { recursive: true })

  for (const site of SITES) {
    const target = fileFor(site)
    if (!force && fs.existsSync(target)) {
      console.log(`${site.padEnd(16)} cached`)
      continue
    }

    try {
      const scraped = await scrape(site, { full: true, screenshots: 2 })
      const images = await loadShots(scraped)
      fs.writeFileSync(target, JSON.stringify({ site, scraped, images } satisfies Fixture))

      const mb = (fs.statSync(target).size / 1e6).toFixed(1)
      console.log(
        `${site.padEnd(16)} ok — ${images.length} shot(s), ${scraped.textBlocks.length} blocks, ${mb}MB`,
      )
    } catch (cause) {
      console.log(`${site.padEnd(16)} FAILED — ${cause instanceof Error ? cause.message : cause}`)
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await build(process.argv.includes('--force'))
}
