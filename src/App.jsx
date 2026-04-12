import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import SeriesGrid from './components/SeriesGrid'
import SeriesModal from './SeriesModal'

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

function App() {
  const [series, setSeries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('All')
  const [selectedProvider, setSelectedProvider] = useState('All')
  const [selectedYear, setSelectedYear] = useState('All')
  const [sortBy, setSortBy] = useState('review-newest')
  const [ratingFilter, setRatingFilter] = useState('all')
  const [myRatedSeriesIds, setMyRatedSeriesIds] = useState([])
  const [selectedSeries, setSelectedSeries] = useState(null)

  useEffect(() => {
    document.title = 'What to Watch - Guardian Top TV Picks'
  }, [])

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setSelectedSeries(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  async function fetchSeries() {
    const { data, error } = await supabase
      .from('series')
      .select('*')
      .gte('guardian_avg_stars', 3)

    if (error) {
      console.error('Supabase error:', error)
      setError(error.message)
      return []
    }

    setSeries(data || [])
    return data || []
  }

  async function fetchMyRatings() {
    const sessionId = getOrCreateSessionId()

    const { data, error } = await supabase
      .from('user_ratings')
      .select('series_id')
      .eq('session_id', sessionId)

    if (error) {
      console.error('User ratings fetch error:', error)
      return
    }

    const ids = [...new Set((data || []).map((item) => item.series_id).filter(Boolean))]
    setMyRatedSeriesIds(ids)
  }

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError('')

      await Promise.all([fetchSeries(), fetchMyRatings()])

      setLoading(false)
    }

    loadData()
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

  const myShows = useMemo(() => {
    const rated = series.filter((item) => myRatedSeriesIds.includes(item.id))
    return sortSeriesList(rated, sortBy)
  }, [series, myRatedSeriesIds, sortBy])

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
    <main style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>What to Watch: Guardian Top TV Picks</h1>
      <p style={{ marginTop: 0, color: '#555' }}>
        {filteredSeries.length} Guardian-rated shows currently match your filters.
      </p>

      {myShows.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: '1rem',
              marginBottom: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <h2 style={{ margin: 0 }}>My Shows</h2>
            <p style={{ margin: 0, color: '#666' }}>
              Shows you’ve rated in this browser session.
            </p>
          </div>

          <SeriesGrid
            series={myShows}
            onSelect={setSelectedSeries}
            compact
          />
        </section>
      )}

      <div
        style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '1rem',
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          placeholder="Search Guardian-rated shows..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: '0.5rem',
            width: '100%',
            maxWidth: '320px',
            borderRadius: '6px',
            border: '1px solid #ccc',
          }}
        />

        <select
          value={selectedGenre}
          onChange={(e) => setSelectedGenre(e.target.value)}
          style={{
            padding: '0.5rem',
            width: '100%',
            maxWidth: '200px',
            borderRadius: '6px',
            border: '1px solid #ccc',
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
            padding: '0.5rem',
            width: '100%',
            maxWidth: '240px',
            borderRadius: '6px',
            border: '1px solid #ccc',
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
            padding: '0.5rem',
            width: '100%',
            maxWidth: '160px',
            borderRadius: '6px',
            border: '1px solid #ccc',
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
            padding: '0.5rem',
            width: '100%',
            maxWidth: '220px',
            borderRadius: '6px',
            border: '1px solid #ccc',
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
            padding: '0.5rem',
            width: '100%',
            maxWidth: '180px',
            borderRadius: '6px',
            border: '1px solid #ccc',
          }}
        >
          <option value="all">All ratings</option>
          <option value="3plus">3★+</option>
          <option value="4plus">4★+</option>
          <option value="5plus">5★+</option>
          <option value="my">My ratings only</option>
        </select>
      </div>

      {!loading && !error && myShows.length === 0 && (
        <p style={{ color: '#666' }}>
          Rate a few shows to build your My Shows row.
        </p>
      )}

      {loading && <p>Loading Guardian-rated series...</p>}
      {error && <p>Error: {error}</p>}

      {!loading && !error && filteredSeries.length === 0 && (
        <p>No Guardian 3★+ shows match your filters.</p>
      )}

      {!loading && !error && filteredSeries.length > 0 && (
        <section>
          <h2 style={{ marginBottom: '0.75rem' }}>All Shows</h2>
          <SeriesGrid
            series={filteredSeries}
            onSelect={setSelectedSeries}
          />
        </section>
      )}

      <SeriesModal
        series={selectedSeries}
        onClose={() => setSelectedSeries(null)}
        onRatingSaved={async () => {
          const data = await fetchSeries()
          await fetchMyRatings()

          if (selectedSeries && data.length > 0) {
            const updated = data.find((item) => item.id === selectedSeries.id)
            if (updated) {
              setSelectedSeries(updated)
            }
          }
        }}
      />
    </main>
  )
}

export default App