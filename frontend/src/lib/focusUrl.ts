/** The hero's URL field — the page's single action. */
export const URL_INPUT_ID = 'agape-url'

/**
 * Sends the visitor to the one thing this page asks them to do: scrolls the
 * hero into view and puts the caret in the URL box.
 *
 * Every "start" affordance routes through here, so a CTA is never a link to
 * nowhere. Falls back to the plain `#top` anchor if the input isn't mounted.
 */
export function focusUrlInput() {
  const input = document.getElementById(URL_INPUT_ID)
  if (!input) return

  window.scrollTo({
    top: 0,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth',
  })

  // Focus after the scroll settles, or the browser jumps the page itself.
  window.setTimeout(() => input.focus({ preventScroll: true }), 420)
}
