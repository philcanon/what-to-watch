function formatProviderName(name) {
  const map = {
    'Disney Plus': 'Disney+',
    'Amazon Prime Video': 'Prime Video',
    'Amazon Prime Video with Ads': 'Prime Video',
    'Amazon Video': 'Prime Video',
    'Paramount Plus': 'Paramount+',
    'Paramount Plus Premium': 'Paramount+',
    'Paramount Plus Basic with Ads': 'Paramount+',
    'Paramount+ Amazon Channel': 'Paramount+',
    'Paramount Plus Apple TV Channel ': 'Paramount+',
  }

  return map[name] || name
}

function SeriesCard({ item, onSelect }) {
  const providers = (item.watch_providers_au?.flatrate || []).map(formatProviderName)
  const uniqueProviders = [...new Set(providers)]

  function handleSelect() {
    if (onSelect) onSelect(item)
  }

  return (
    <article
      onClick={handleSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleSelect()
        }
      }}
      role="button"
      tabIndex={0}
      style={{
        border: '1px solid #ddd',
        borderRadius: '12px',
        overflow: 'hidden',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        cursor: 'pointer',
      }}
    >
      {item.poster_url && (
        <img
          src={item.poster_url}
          alt={`${item.name} poster`}
          style={{
            width: '100%',
            height: '390px',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      )}

      <div style={{ padding: '1rem' }}>
        <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>
          {item.name}
        </h2>

        <p style={{ margin: '0 0 0.4rem 0' }}>
          <strong>Year:</strong> {item.first_air_year || 'Unknown'}
        </p>

        <p style={{ margin: '0 0 0.4rem 0' }}>
          <strong>Genres:</strong> {item.genres || 'Unknown'}
        </p>

        <p style={{ margin: '0 0 0.4rem 0' }}>
          <strong>Country:</strong> {item.country || 'Unknown'}
        </p>

        {item.guardian_avg_stars && (
          <div style={{ margin: '0 0 0.5rem 0' }}>
            <p style={{ margin: 0 }}>
              <strong>Guardian:</strong> {item.guardian_avg_stars}★
            </p>

            {item.latest_review_date && (
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#666' }}>
                Reviewed: {item.latest_review_date}
              </p>
            )}

            {item.latest_guardian_url ? (
              <p style={{ margin: '0.35rem 0 0 0' }}>
                <a
                  href={item.latest_guardian_url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    color: '#005689',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                  }}
                >
                  Read Guardian review
                </a>
              </p>
            ) : (
              <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', color: '#777' }}>
                Guardian review link not available
              </p>
            )}
          </div>
        )}

        <div style={{ margin: '0 0 0.6rem 0' }}>
          <p style={{ margin: 0 }}>
            <strong>Users:</strong>{' '}
            {item.user_avg_rating ? `${item.user_avg_rating}★` : 'No ratings yet'}
            {item.user_rating_count > 0 ? ` (${item.user_rating_count})` : ''}
          </p>
        </div>

        <div style={{ margin: '0 0 0.75rem 0' }}>
          <strong>Streaming:</strong>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              marginTop: '0.5rem',
            }}
          >
            {uniqueProviders.length > 0 ? (
              uniqueProviders.map((provider) => (
                <span
                  key={provider}
                  style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '999px',
                    background: '#f3f4f6',
                    border: '1px solid #ddd',
                    fontSize: '0.9rem',
                  }}
                >
                  {provider}
                </span>
              ))
            ) : (
              <span>Not listed</span>
            )}
          </div>
        </div>

        <p
          style={{
            margin: 0,
            display: '-webkit-box',
            WebkitLineClamp: 5,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {item.overview || 'No overview available.'}
        </p>
      </div>
    </article>
  )
}

export default SeriesCard