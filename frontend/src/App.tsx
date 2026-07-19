import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Landing } from './pages/Landing'

/*
 * Split from the landing bundle: these two pull in Remotion and three.js,
 * which is most of the app's weight. Someone reading the marketing page
 * shouldn't pay for a renderer they haven't asked for yet.
 */
const Pipeline = lazy(() =>
  import('./pages/Pipeline').then((m) => ({ default: m.Pipeline })),
)
const Editor = lazy(() =>
  import('./pages/Editor').then((m) => ({ default: m.Editor })),
)

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Landing />} />
          {/* ?url= — the pipeline reads it and starts the job on mount. */}
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/editor" element={<Editor />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
