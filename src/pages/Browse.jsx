import { useEffect, useMemo, useState } from 'react'
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

function getTrendingScore(item) {
  const guardian = Number(item.guardian_avg_stars) || 0
  const userCount = Number(item.user_rating_count) || 0
  const recency = item.latest_review_date
    ? new Date(item.latest_review_date).getTime()
    : 0

  const now = Date.now()
  const ageDays = (now - recency) / (1000 * 60 * 60 * 24)
  const recencyScore = Math.max(0, 1 - ageDays / 1825)

  return guardian * 2 + Math.log10(userCount + 1) * 2 + recencyScore * 3
}

function sortSeriesList(items, sortBy) {
  const sorted = [...items]

  sorted.sort((a, b) => {
    if (sortBy === 'review-newest') {
      return new Date(b.latest_review_date || 0) - new Date(a.latest_review_date || 0)
    }

    if (sortBy === 'year-newest') {
      return (b.first_air_year || 0) - (a.first_air_year || 0)
    }

    if (sortBy === 'stars-highest') {
      return (Number(b.guardian_avg_stars) || 0) - (Number(a.guardian_avg_stars) || 0)
    }

    if (sortBy === 'trending') {
      return getTrendingScore(b) - getTrendingScore(a)
    }

    if (sortBy === 'title-az') {
      return (a.name || '').localeCompare(b.name || '')
    }

    return 0
  })

  return sorted
}

export default function Browse() {
  const [series, setSeries] = useState([])
  const [favorites, setFavorites] = useState([])
  const [selectedSeries, setSelectedSeries] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('All')
  const [selectedProvider, setSelectedProvider] = useState('All')
  const [selectedYear, setSelectedYear] = useState('All')
  const [sortBy, setSortBy] = useState('review-newest')
  const [ratingFilter, setRatingFilter] = useState('all')
  const [myRatedSeriesIds, setMyRatedSeriesIds] = useState([])

  async function fetchSeries() {
    const { data, error } = await supabase
      .from('series')
      .select('*')
      .gte('guardian_avg_stars', 3)

    if (error) {
      console.error('Supabase series fetch error:', error)
      setError(error.message)
      return []
    }

    setSeries(data || [])
    return data || []
  }

  async function fetchFavorites() {
    const sessionId = getOrCreateSessionId()

    const { data, error } = await supabase
      .from('favorites')
      .select('series_id')
      .eq('session_id', sessionId)

    if (error) {
      console.error('Supabase favorites fetch error:', error)
      return
    }

    setFavorites((data || []).map((row) => row.series_id))
  }

  async function fetchMyRatings() {
    const sessionId = getOrCreateSessionId()

    const { data, error } = await supabase
      .from('user_ratings')
      .select('series_id')
      .eq('session_id', sessionId)

    if (error) {
      console.error('Supabase ratings fetch error:', error)
      return
    }

    const ids = [...new Set((data || []).map((row) => row.series_id).filter(Boolean))]
    setMyRatedSeriesIds(ids)
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
      await Promise.all([fetchSeries(), fetchFavorites(), fetchMyRatings()])
      setLoading(false)
    }

    load()
  }, [])

  const genreOptions = useMemo(
    () => [
      'All',
      ...new Set(
        series.flatMap((item) =>
          item.genres
            ? item.genres.split(',').map((genre) => genre.trim())
            : []
        )
      ),
    ],
    [series]
  )

  const providerOptions = useMemo(
    () => [
      'All',
      ...new Set(
        series.flatMap((item) => item.watch_providers_au?.flatrate || [])
      ),
    ],
    [series]
  )

  const yearOptions = useMemo(
    () => [
      'All',
      ...new Set(
        series
          .map((item) => item.first_air_year)
          .filter(Boolean)
          .sort((a, b) => b - a)
      ),
    ],
    [series]
  )

  const filteredSeries = useMemo(() => {
    const term = searchTerm.toLowerCase()

    const results = series.filter((item) => {
      const providersArray = item.watch_providers_au?.flatrate || []
      const providersText = providersArray.join(' ').toLowerCase()

      const matchesSearch =
        item.name?.toLowerCase().includes(term) ||
        item.overview?.toLowerCase().includes(term) ||
        item.genres?.toLowerCase().includes(term) ||
        item.country?.toLowerCase().includes(term) ||
        String(item.first_air_year || '').includes(term) ||
        providersText.includes(term)

      const itemGenres = item.genres
        ? item.genres.split(',').map((genre) => genre.trim())
        : []

      const matchesGenre =
        selectedGenre === 'All' || itemGenres.includes(selectedGenre)

      const matchesProvider =
        selectedProvider === 'All' || providersArray.includes(selectedProvider)

      const matchesYear =
        selectedYear === 'All' ||
        String(item.first_air_year) === String(selectedYear)

      const guardianStars = Number(item.guardian_avg_stars) || 0

      const matchesRatingFilter =
        ratingFilter === 'all' ||
        (ratingFilter === '3plus' && guardianStars >= 3) ||
        (ratingFilter === '4plus' && guardianStars >= 4) ||
        (ratingFilter === '5plus' && guardianStars >= 5) ||
        (ratingFilter === 'my' && myRatedSeriesIds.includes(item.id))

      return (
        matchesSearch &&
        matchesGenre &&
        matchesProvider &&
        matchesYear &&
        matchesRatingFilter
      )
    })

    return sortSeriesList(results, sortBy)
  }, [
    series,
    searchTerm,
    selectedGenre,
    selectedProvider,
    selectedYear,
    sortBy,
    ratingFilter,
    myRatedSeriesIds,
  ])

  return (
    <div style={{ padding: '1rem', maxWidth: '1600px', margin: '0 auto' }}>
      <h1>Browse Shows</h1>

      <p style={{ marginTop: 0, color: '#555' }}>
        {filteredSeries.length} Guardian-rated shows currently match your filters.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1rem',
          alignItems: 'stretch',
        }}
      >
        <input
          type="text"
          placeholder="Search Guardian-rated shows..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: '0.75rem',
            width: '100%',
            minWidth: 0,
            borderRadius: '6px',
            border: '1px solid #ccc',
            boxSizing: 'border-box',
          }}
        />

        <select
          value={selectedGenre}
          onChange={(e) => setSelectedGenre(e.target.value)}
          style={{
            padding: '0.75rem',
            width: '100%',
            minWidth: 0,
            borderRadius: '6px',
            border: '1px solid #ccc',
            boxSizing: 'border-box',
          }}
        >
          {genreOptions.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </select>

        <select
          value={selectedProvider}
          onChange={(e) => setSelectedProvider(e.target.value)}
          style={{
            padding: '0.75rem',
            width: '100%',
            minWidth: 0,
            borderRadius: '6px',
            border: '1px solid #ccc',
            boxSizing: 'border-box',
          }}
        >
          {providerOptions.map((provider) => (
            <option key={provider} value={provider}>
              {provider}
            </option>
          ))}
        </select>

        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          style={{
            padding: '0.75rem',
            width: '100%',
            minWidth: 0,
            borderRadius: '6px',
            border: '1px solid #ccc',
            boxSizing: 'border-box',
          }}
        >
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            padding: '0.75rem',
            width: '100%',
            minWidth: 0,
            borderRadius: '6px',
            border: '1px solid #ccc',
            boxSizing: 'border-box',
          }}
        >
          <option value="review-newest">Newest review</option>
          <option value="year-newest">Newest year</option>
          <option value="stars-highest">Highest stars</option>
          <option value="trending">Trending</option>
          <option value="title-az">Title A–Z</option>
        </select>

        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          style={{
            padding: '0.75rem',
            width: '100%',
            minWidth: 0,
            borderRadius: '6px',
            border: '1px solid #ccc',
            boxSizing: 'border-box',
          }}
        >
          <option value="all">All ratings</option>
          <option value="3plus">3★+</option>
          <option value="4plus">4★+</option>
          <option value="5plus">5★+</option>
          <option value="my">My ratings only</option>
        </select>
      </div>

      {loading && <p>Loading shows...</p>}
      {error && <p>Error: {error}</p>}

      {!loading && !error && filteredSeries.length === 0 && (
        <p>No shows match your filters.</p>
      )}

      {!loading && !error && filteredSeries.length > 0 && (
        <SeriesGrid
          series={filteredSeries}
          onSelect={setSelectedSeries}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
        />
      )}

      <SeriesModal
        series={selectedSeries}
        onClose={() => setSelectedSeries(null)}
        onRatingSaved={fetchSeries}
      />
    </div>
  )
}