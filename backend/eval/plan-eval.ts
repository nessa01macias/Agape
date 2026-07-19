/* ---------------------------------------------------------------
   Agape — planner eval
   ---------------------------------------------------------------
   Runs the planner across every cached fixture and prints what it
   wrote, so prompt changes can be judged side by side instead of one
   site at a time.

     node --env-file-if-exists=.env eval/plan-eval.ts
     GEMINI_MODEL=gemini-3-flash-preview node ... eval/plan-eval.ts
     node ... eval/plan-eval.ts --json > before.json   # to diff runs
   --------------------------------------------------------------- */

import { planVideo } from '../src/plan.ts'
import { loadFixtures } from './fixtures.ts'

const fixtures = loadFixtures()
if (!fixtures.length) {
  console.error('No fixtures. Run: node --env-file-if-exists=.env eval/fixtures.ts')
  process.exit(1)
}

const asJson = process.argv.includes('--json')
const model = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash'
const results: unknown[] = []

if (!asJson) console.log(`model: ${model}\n`)

for (const fixture of fixtures) {
  const started = Date.now()
  const plan = await planVideo(fixture.scraped, () => {}, fixture.images)
  const ms = Date.now() - started

  results.push({ site: fixture.site, ms, plan })

  if (asJson) continue

  const flag = plan.fromModel ? '' : '   ⚠️  FALLBACK'
  console.log(`━━ ${fixture.site}  (${(ms / 1000).toFixed(1)}s)${flag}`)
  console.log(`   accent   ${plan.accent}   (scraper guessed ${fixture.scraped.accent})`)
  console.log(`   eyebrow  ${plan.titles.eyebrow}`)
  console.log(`   tagline  ${plan.titles.tagline}`)
  console.log(`   footer   ${plan.titles.footer}`)
  console.log(`   format   ${plan.format}`)
  console.log(`   why      ${plan.reason}`)
  for (const shot of plan.shots) {
    console.log(`   · ${String(shot.durationInFrames).padStart(3)}f  ${shot.title} — ${shot.description}`)
  }
  console.log()
}

if (asJson) console.log(JSON.stringify(results, null, 2))
