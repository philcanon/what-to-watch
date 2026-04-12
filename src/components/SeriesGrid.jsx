import React, { useEffect, useState } from 'react'

function providerNames(providers) {
  if (!providers) return []

  if (Array.isArray(providers)) {
    return providers
      .map((p) => {
        if (typeof p === 'string') return p
        return p?.provider_name ?? p?.name ?? null
      })
      .filter(Boolean)
  }

  if (providers?.flatrate && Array.isArray(providers.flatrate)) {
    return providers.flatrate
      .map((p) => {
        if (typeof p === 'string') return p
        return p?.provider_name ?? p?.name ?? null
      })
      .filter(Boolean)
  }

  return []
}

function starsFromAvg(value) {
  if (value == null) return '—'
  const num = Number(value)
  if (Number.isNaN(num)) return '—'
  return `${num.toFixed(1)}★`
}

function userRatingText(avg, count) {
  if (avg == null || Number(count || 0) === 0) {
    return 'Not yet rated'
  }

  return `${Number(avg).toFixed(1)}★ (${count || 0})`
}

function getColumnCount(width, compact) {
  if (compact) {
    if (width < 480) return 2
    if (width < 900) return 3
    return 4
  }

  if (width < 600) return 2
  if (width < 900) return 3
  if (width < 1200) return 4
  return 5
}

export default function SeriesGrid({ series, onSelect, compact = false }) {
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1400
  )

  useEffect(() => {
    function handleResize() {
      setWindowWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (!series || series.length === 0) return null

  const columns = getColumnCount(windowWidth, compact)

  return (
    <div
      style={{
        display: 'grid',
        gap: compact ? '0.75rem' : '1rem',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {series.map((item) => {
        const posterUrl = item.poster_url || null
        const providers = providerNames(item.watch_providers_au)

        return (
          <div
            key={item.id}
            onClick={() => onSelect(item)}
            style={{
              cursor: 'pointer',
              background: '#fff',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
            }}
          >
            {posterUrl ? (
              <img
                src={posterUrl}
                alt={item.name || 'Series poster'}
                style={{
                  width: '100%',
                  height: compact ? '180px' : '270px',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            ) : (
              <div
                style={{
                  height: compact ? '180px' : '270px',
                  background: '#e9ecef',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  color: '#666',
                }}
              >
                No image
              </div>
            )}

            <div style={{ padding: compact ? '8px' : '10px' }}>
              <h3
                style={{
                  margin: '0 0 6px 0',
                  fontSize: compact ? '1rem' : '1.05rem',
                  lineHeight: 1.25,
                  color: '#24384d',
                }}
              >
                {item.name}
              </h3>

              <p
                style={{
                  margin: '0 0 6px 0',
                  fontSize: compact ? '0.78rem' : '0.85rem',
                  color: '#666',
                }}
              >
                {item.first_air_year || 'Year unknown'}
              </p>

              {!compact && (
                <>
                  <p
                    style={{
                      margin: '0 0 6px 0',
                      fontSize: '0.82rem',
                      color: '#444',
                    }}
                  >
                    <strong>Guardian:</strong> {starsFromAvg(item.guardian_avg_stars)}
                  </p>

                  <p
                    style={{
                      margin: '0 0 6px 0',
                      fontSize: '0.82rem',
                      color: '#444',
                    }}
                  >
                    <strong>Users:</strong>{' '}
                    {userRatingText(item.user_avg_rating, item.user_rating_count)}
                  </p>

                  <p
                    style={{
                      margin: '0 0 6px 0',
                      fontSize: '0.82rem',
                      color: '#444',
                    }}
                  >
                    <strong>Watch:</strong>{' '}
                    {providers.length > 0 ? providers.join(', ') : 'Not listed'}
                  </p>

                  {item.latest_guardian_url && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.82rem',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <a
                        href={item.latest_guardian_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: '#1a73e8',
                          textDecoration: 'none',
                          wordBreak: 'break-word',
                        }}
                      >
                        Read Guardian review
                      </a>
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}