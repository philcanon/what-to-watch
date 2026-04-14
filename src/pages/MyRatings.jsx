import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import SeriesGrid from '../components/SeriesGrid'
import SeriesModal from '../SeriesModal'

const SESSION_KEY = 'wtw_session_id'

function getOrCreateSessionId() {
  let id = localStorage.getItem(SESSION_KEY)

  if (!id) {
    id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem(SESSION_KEY, id)
  }

  return id
}

export default function MyRatings() {
  const [series, setSeries] = useState([])
  const [selectedSeries, setSelectedSeries] = useState(null)

  async function fetchRatedShows() {
    const sessionId = getOrCreateSessionId()

    const { data, error } = await supabase
      .from('user_ratings')
      .select('series(*)')
      .eq('session_id', sessionId)

    if (error) {
      console.error('My ratings fetch error:', error)
      return
    }

    setSeries((data || []).map((row) => row.series).filter(Boolean))
  }

  useEffect(() => {
    fetchRatedShows()
  }, [])

  return (
    <div style={{ padding: '1rem', maxWidth: '1600px', margin: '0 auto' }}>
      <h1>My Ratings</h1>

      {series.length === 0 ? (
        <p>You have not rated any shows yet.</p>
      ) : (
        <SeriesGrid
          series={series}
          onSelect={setSelectedSeries}
        />
      )}

      <SeriesModal
        series={selectedSeries}
        onClose={() => setSelectedSeries(null)}
        onRatingSaved={fetchRatedShows}
      />
    </div>
  )
}