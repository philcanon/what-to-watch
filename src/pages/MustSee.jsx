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

export default function MustSee() {
  const [series, setSeries] = useState([])
  const [favorites, setFavorites] = useState([])
  const [selectedSeries, setSelectedSeries] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function fetchMustSee() {
    const { data, error } = await supabase
      .from('series')
      .select('*')
      .eq('is_must_see', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('Must See fetch error:', error)
      setError(error.message)
      return
    }

    setSeries(data || [])
  }

  async function fetchFavorites() {
    const sessionId = getOrCreateSessionId()

    const { data, error } = await supabase
      .from('favorites')
      .select('series_id')
      .eq('session_id', sessionId)

    if (error) {
      console.error('Favorites fetch error:', error)
      return
    }

    setFavorites((data || []).map((row) => row.series_id))
  }

  async function toggleFavorite(seriesId) {
    const sessionId = getOrCreateSessionId()

    if (favorites.includes(seriesId)) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('series_id', seriesId)
        .eq('session_id', sessionId)

      if (error) {
        console.error('Favorite delete error:', error)
        return
      }
    } else {
      const { error } = await supabase
        .from('favorites')
        .insert({
          series_id: seriesId,
          session_id: sessionId,
        })

      if (error) {
        console.error('Favorite insert error:', error)
        return
      }
    }

    fetchFavorites()
  }

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      await Promise.all([fetchMustSee(), fetchFavorites()])
      setLoading(false)
    }

    load()
  }, [])

  return (
    <div style={{ padding: '1rem', maxWidth: '1600px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '0.4rem' }}>Must See</h1>

      <p style={{ marginTop: 0, color: '#555', maxWidth: '760px', lineHeight: 1.5 }}>
        A curated collection of outstanding TV series, including modern classics and
        essential viewing beyond the current Guardian review pipeline.
      </p>

      {loading && <p>Loading must-see shows...</p>}
      {error && <p>Error: {error}</p>}

      {!loading && !error && series.length === 0 && (
        <p>No must-see shows found.</p>
      )}

      {!loading && !error && series.length > 0 && (
        <SeriesGrid
          series={series}
          onSelect={setSelectedSeries}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
        />
      )}

      <SeriesModal
        series={selectedSeries}
        onClose={() => setSelectedSeries(null)}
        onRatingSaved={fetchMustSee}
      />
    </div>
  )
}