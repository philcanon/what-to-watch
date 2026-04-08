import React, { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

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

function starsFromAvg(value) {
  if (value == null) return '—'
  const num = Number(value)
  if (Number.isNaN(num)) return '—'
  return `${num.toFixed(1)}★`
}

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

export default function SeriesModal({ series, onClose, onRatingSaved }) {
  const [rating, setRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setRating(0)
    setReviewText('')
    setMessage('')
  }, [series?.id])

  if (!series) return null

  const providers = providerNames(series.watch_providers_au)

  async function saveRating() {
    if (!rating || !series?.id) return

    setSaving(true)
    setMessage('')

    const sessionId = getOrCreateSessionId()

    const { error } = await supabase
      .from('user_ratings')
      .upsert(
        {
          series_id: series.id,
          session_id: sessionId,
          rating,
          review_text: reviewText.trim() || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'series_id,session_id',
        }
      )

    if (error) {
      console.error('Rating save error:', error)
      setMessage(`Could not save rating: ${error.message}`)
      setSaving(false)
      return
    }

    setMessage('Your rating has been saved.')

    if (onRatingSaved) {
      await onRatingSaved()
    }

    setSaving(false)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#111',
          color: '#fff',
          width: 'min(900px, 100%)',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: '16px',
          padding: '24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <h2>{series.name}</h2>
          <button onClick={onClose}>Close</button>
        </div>

        <p>
          <strong>Guardian:</strong> {starsFromAvg(series.guardian_avg_stars)}
        </p>

        <p>
          <strong>User rating:</strong>{' '}
          {series.user_avg_rating
            ? `${Number(series.user_avg_rating).toFixed(1)}★ (${series.user_rating_count || 0})`
            : 'Not yet rated'}
        </p>

        <p>{series.overview}</p>

        <h3>Rate this show</h3>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              style={{
                fontSize: '1.8rem',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: star <= rating ? '#ffd166' : '#666',
              }}
            >
              ★
            </button>
          ))}
        </div>

        <textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Optional note..."
          rows={4}
          style={{ width: '100%', marginBottom: '10px' }}
        />

        <button onClick={saveRating} disabled={!rating || saving}>
          {saving ? 'Saving...' : 'Save my rating'}
        </button>

        {message && <p>{message}</p>}
      </div>
    </div>
  )
}