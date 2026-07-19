/* ---------------------------------------------------------------
   Agape — brand guess from a bare URL
   ---------------------------------------------------------------
   This is the *fallback*, not the product. It reads a name off the
   hostname and picks an accent by hashing it — no network, no model.

   The real values arrive as `artifact` events (see `jobs.ts`). We show
   this guess on frame one so the editor is never empty, then let live
   artifacts overwrite it as the curator finds them.
   --------------------------------------------------------------- */

/** Deliberately vivid — these only ever stand in for a real brand colour. */
const ACCENTS = ['#6C5CE7', '#00B894', '#0984E3', '#E17055', '#FD79A8', '#FDCB6E']

export type Brand = {
  name: string
  domain: string
  accent: string
}

export function brandFromUrl(raw: string): Brand {
  let hostname: string
  try {
    hostname = new URL(raw.includes('://') ? raw : `https://${raw}`).hostname
  } catch {
    hostname = raw
  }

  const domain = hostname.replace(/^www\./, '')
  const name = domain.split('.')[0] || 'your startup'

  // A given domain always lands on the same accent, so the preview
  // doesn't change colour between reloads.
  let hash = 0
  for (const char of domain) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0
  }
  const accent = ACCENTS[Math.abs(hash) % ACCENTS.length]

  return { name, domain, accent }
}
