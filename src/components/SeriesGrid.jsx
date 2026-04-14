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

function getColumnCount(width) {
  if (width < 600) return 2
  if (width < 900) return 3
  if (width < 1200) return 4
  return 5
}

export default function SeriesGrid({
  series,
  onSelect,
  compact = false,
  favorites = [],
  onToggleFavorite,
}) {
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

  const columns = getColumnCount(windowWidth)

  return (
    <div
      style={{
        display: 'grid',
        gap: compact ? '0.85rem' : '1.1rem',
        gridTemplateColumns: compact
          ? 'repeat(auto-fill, minmax(140px, 180px))'
          : `repeat(${columns}, minmax(0, 1fr))`,
        justifyContent: compact ? 'start' : 'stretch',
      }}
    >
      {series.map((item) => {
        const posterUrl = item.poster_url || null
        const providers = providerNames(item.watch_providers_au)
        const isFavorite = favorites.includes(item.id)

        return (
          <div
            key={item.id}
            onClick={() => onSelect(item)}
            onMouseEnter={(e) => {
              if (!compact) {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,0,0,0.12)'
              }
            }}
            onMouseLeave={(e) => {
              if (!compact) {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,0,0,0.08)'
              }
            }}
            style={{
              cursor: 'pointer',
              background: '#fff',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
              position: 'relative',
              transition: 'transform 0.18s ease, box-shadow 0.18s ease',
              border: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            {onToggleFavorite && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleFavorite(item.id)
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.08)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                }}
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  right: '10px',
                  zIndex: 2,
                  background: 'rgba(255,255,255,0.96)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: '999px',
                  width: '40px',
                  height: '40px',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                  color: isFavorite ? '#c1121f' : '#666',
                  transition: 'transform 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
                }}
                aria-label={isFavorite ? 'Remove from favourites' : 'Add to favourites'}
                title={isFavorite ? 'Remove from favourites' : 'Add to favourites'}
              >
                {isFavorite ? '♥' : '♡'}
              </button>
            )}

            {posterUrl ? (
              <img
                src={posterUrl}
                alt={item.name || 'Series poster'}
                style={{
                  width: '100%',
                  height: compact ? '180px' : '270px',
                  objectFit: 'cover',
                  display: 'block',
                  background: '#f1f1f1',
                }}
              />
            ) : (
              <div
                style={{
                  height: compact ? '180px' : '270px',
                  background: '#eceff1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.82rem',
                  color: '#666',
                }}
              >
                No image
              </div>
            )}

            <div
              style={{
                padding: compact ? '10px' : '12px',
              }}
            >
              <h3
                style={{
                  margin: '0 0 8px 0',
                  fontSize: compact ? '1rem' : '1.08rem',
                  lineHeight: 1.25,
                  color: '#1f2f3d',
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                }}
              >
                {item.name}
              </h3>

              <p
                style={{
                  margin: '0 0 8px 0',
                  fontSize: compact ? '0.78rem' : '0.86rem',
                  color: '#6b7280',
                }}
              >
                {item.first_air_year || 'Year unknown'}
              </p>

              {!compact && (
                <>
                  <p
                    style={{
                      margin: '0 0 6px 0',
                      fontSize: '0.83rem',
                      color: '#374151',
                      lineHeight: 1.35,
                    }}
                  >
                    <strong>Guardian:</strong> {starsFromAvg(item.guardian_avg_stars)}
                  </p>

                  <p
                    style={{
                      margin: '0 0 6px 0',
                      fontSize: '0.83rem',
                      color: '#374151',
                      lineHeight: 1.35,
                    }}
                  >
                    <strong>Users:</strong> {userRatingText(item.user_avg_rating, item.user_rating_count)}
                  </p>

                  <p
                    style={{
                      margin: '0 0 8px 0',
                      fontSize: '0.83rem',
                      color: '#374151',
                      lineHeight: 1.35,
                    }}
                  >
                    <strong>Watch:</strong>{' '}
                    {providers.length > 0 ? providers.join(', ') : 'Not listed'}
                  </p>

                  {item.latest_guardian_url && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.83rem',
                        lineHeight: 1.35,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <a
  href={item.latest_guardian_url}
  target="_blank"
  rel="noreferrer"
  onClick={(e) => e.stopPropagation()}
  style={{
    display: 'inline-block',
    padding: '6px 10px',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#333',
    background: '#f3f4f6',
    border: '1px solid #e5e7eb',
    textDecoration: 'none',
    transition: 'all 0.15s ease',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.background = '#e5e7eb'
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.background = '#f3f4f6'
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