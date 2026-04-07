import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import SeriesGrid from './components/SeriesGrid'
import SeriesModal from './SeriesModal'

function App() {
  const [series, setSeries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('All')
  const [selectedProvider, setSelectedProvider] = useState('All')
  const [selectedYear, setSelectedYear] = useState('All')
  const [sortBy, setSortBy] = useState('review-newest')
  const [fiveStarOnly, setFiveStarOnly] = useState(false)
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

  useEffect(() => {
    async function fetchSeries() {
      const { data, error } = await supabase
        .from('series')
        .select('*')
        .gte('guardian_avg_stars', 3)

      if (error) {
        console.error('Supabase error:', error)
        setError(error.message)
      } else {
        setSeries(data || [])
      }

      setLoading(false)
    }

    fetchSeries()
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

      const matchesFiveStar =
        !fiveStarOnly || Number(item.guardian_avg_stars) === 5

      return (
        matchesSearch &&
        matchesGenre &&
        matchesProvider &&
        matchesYear &&
        matchesFiveStar
      )
    })

    results.sort((a, b) => {
      if (sortBy === 'review-newest') {
        return new Date(b.latest_review_date || 0) - new Date(a.latest_review_date || 0)
      }

      if (sortBy === 'year-newest') {
        return (b.first_air_year || 0) - (a.first_air_year || 0)
      }

      if (sortBy === 'stars-highest') {
        return (Number(b.guardian_avg_stars) || 0) - (Number(a.guardian_avg_stars) || 0)
      }

      if (sortBy === 'title-az') {
        return (a.name || '').localeCompare(b.name || '')
      }

      return 0
    })

    return results
  }, [
    series,
    searchTerm,
    selectedGenre,
    selectedProvider,
    selectedYear,
    sortBy,
    fiveStarOnly,
  ])

  return (
    <main style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>What to Watch: Guardian Top TV Picks</h1>
      <p style={{ marginTop: 0, color: '#555' }}>
        {filteredSeries.length} Guardian-rated shows currently match your filters.
      </p>

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
          <option value="title-az">Title A–Z</option>
        </select>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.95rem',
          }}
        >
          <input
            type="checkbox"
            checked={fiveStarOnly}
            onChange={(e) => setFiveStarOnly(e.target.checked)}
          />
          5★ only
        </label>
      </div>

      {loading && <p>Loading Guardian-rated series...</p>}
      {error && <p>Error: {error}</p>}

      {!loading && !error && filteredSeries.length === 0 && (
        <p>No Guardian 3★+ shows match your filters.</p>
      )}

      {!loading && !error && filteredSeries.length > 0 && (
        <SeriesGrid
          series={filteredSeries}
          onSelect={setSelectedSeries}
        />
      )}

      <SeriesModal
        series={selectedSeries}
        onClose={() => setSelectedSeries(null)}
      />
    </main>
  )
}

export default App