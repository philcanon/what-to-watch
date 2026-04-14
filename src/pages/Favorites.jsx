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

export default function Favorites() {
  const [series, setSeries] = useState([])
  const [favorites, setFavorites] = useState([])
  const [selectedSeries, setSelectedSeries] = useState(null)

  async function fetchFavoritesPage() {
    const sessionId = getOrCreateSessionId()

    const { data, error } = await supabase
      .from('favorites')
      .select('series_id, series(*)')
      .eq('session_id', sessionId)

    if (error) {
      console.error('Favorites page fetch error:', error)
      return
    }

    const rows = data || []
    setFavorites(rows.map((row) => row.series_id))
    setSeries(rows.map((row) => row.series).filter(Boolean))
  }

  async function toggleFavorite(seriesId) {
    const sessionId = getOrCreateSessionId()

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('series_id', seriesId)
      .eq('session_id', sessionId)

    if (error) {
      console.error('Favorite delete error:', error)
      return
    }

    fetchFavoritesPage()
  }

  useEffect(() => {
    fetchFavoritesPage()
  }, [])

  return (
    <div style={{ padding: '1rem', maxWidth: '1600px', margin: '0 auto' }}>
      <h1>Favourites</h1>

      {series.length === 0 ? (
        <p>No favourites yet.</p>
      ) : (
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
        onRatingSaved={fetchFavoritesPage}
      />
    </div>
  )
}