// src/pages/PracticeTestAnalysis.jsx
// Round-2 Issue C: the standalone Analysis page's content moved directly
// into PracticeTestResult.jsx (one scroll, score card up top). This route
// (/practice-tests/analysis/:attemptId) now just redirects to the Result
// page so any old links/bookmarks keep working.

import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export default function PracticeTestAnalysis() {
  const { attemptId } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    navigate(`/practice-tests/result/${attemptId}`, { replace: true })
  }, [attemptId, navigate])

  return null
}