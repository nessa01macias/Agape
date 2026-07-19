import { useNavigate } from 'react-router-dom'
import { Bento } from '../components/Bento'
import { Close } from '../components/Close'
import { Footer } from '../components/Footer'
import { Founders } from '../components/Founders'
import { Hero } from '../components/Hero'
import { Nav } from '../components/Nav'
import { Pricing } from '../components/Pricing'
import { Sequence } from '../components/Sequence'

export function Landing() {
  const navigate = useNavigate()

  /**
   * Hero has already normalised this to a full URL. The pipeline screen
   * owns the job from here — it starts on mount and hands off to the
   * editor when the cut is ready.
   */
  function handleAnalyze(url: string) {
    navigate(`/pipeline?url=${encodeURIComponent(url)}`)
  }

  return (
    <>
      <Nav />
      <main>
        <Hero onAnalyze={handleAnalyze} />
        <Sequence />
        <Bento />
        <Founders />
        <Pricing />
        <Close />
      </main>
      <Footer />
    </>
  )
}
