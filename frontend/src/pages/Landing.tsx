import { useNavigate } from 'react-router-dom'
import { CallToAction } from '../components/CallToAction'
import { Features } from '../components/Features'
import { Footer } from '../components/Footer'
import { Hero } from '../components/Hero'
import { HowItWorks } from '../components/HowItWorks'
import { Marquee } from '../components/Marquee'
import { Nav } from '../components/Nav'
import { Showcase } from '../components/Showcase'
import { useReveal } from '../hooks/useReveal'

export function Landing() {
  useReveal()
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
        <Marquee />
        <HowItWorks />
        <Showcase />
        <Features />
        <CallToAction />
      </main>
      <Footer />
    </>
  )
}
