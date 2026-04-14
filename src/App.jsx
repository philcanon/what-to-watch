import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Browse from './pages/Browse'
import Favorites from './pages/Favorites'
import MyRatings from './pages/MyRatings'

export default function App() {
  const location = useLocation()

  function navLinkStyle(path) {
    const isActive = location.pathname === path

    return {
      padding: '0.5rem 1rem',
      borderRadius: '999px',
      textDecoration: 'none',
      fontSize: '0.95rem',
      fontWeight: 500,
      border: '1px solid #ddd',
      background: isActive ? '#111' : '#fff',
      color: isActive ? '#fff' : '#333',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    }
  }

  return (
    <main style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* HEADER */}
      <nav
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
          padding: '1rem 1.5rem',
          background: '#fafafa',
          borderBottom: '1px solid #ddd',
          flexWrap: 'wrap',
        }}
      >
        {/* Title + Subtitle */}
        <div>
          <div
            style={{
              fontSize: 'clamp(1.6rem, 3vw, 2.3rem)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: '#111',
            }}
          >
            What to Watch
          </div>

          <div
            style={{
              fontSize: '0.9rem',
              color: '#666',
              marginTop: '4px',
              maxWidth: '420px',
              lineHeight: 1.4,
            }}
          >
            The best TV shows curated from The Guardian (UK) reviews.
          </div>
        </div>

        {/* Navigation */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
          <Link to="/" style={navLinkStyle('/')}>
            Browse
          </Link>

          <Link to="/favorites" style={navLinkStyle('/favorites')}>
            ❤️ Favourites
          </Link>

          <Link to="/my-ratings" style={navLinkStyle('/my-ratings')}>
            ⭐ My Ratings
          </Link>
        </div>
      </nav>

      {/* ROUTES */}
      <Routes>
        <Route path="/" element={<Browse />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/my-ratings" element={<MyRatings />} />
      </Routes>
    </main>
  )
}