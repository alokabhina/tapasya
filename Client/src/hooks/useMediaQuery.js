// src/hooks/useMediaQuery.js
// Tiny matchMedia hook — used by the practice-test engine to pick layout
// (palette sidebar vs drawer, split vs stacked passage) in JS so we mount
// only ONE version of the DOM instead of hiding the other with CSS
// (matters on low-RAM phones).
import { useEffect, useState } from 'react'

export default function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false
  )
  useEffect(() => {
    if (!window.matchMedia) return
    const mql = window.matchMedia(query)
    const onChange = (e) => setMatches(e.matches)
    setMatches(mql.matches)
    mql.addEventListener ? mql.addEventListener('change', onChange) : mql.addListener(onChange)
    return () => (mql.removeEventListener ? mql.removeEventListener('change', onChange) : mql.removeListener(onChange))
  }, [query])
  return matches
}