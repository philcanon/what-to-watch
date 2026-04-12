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
  const [loadingExistingRating, setLoadingExistingRating] = useState(false)
  const [message, setMessage] = useState('')
  const [hasExistingRating, setHasExistingRating] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadExistingRating() {
      if (!series?.id) return

      setRating(0)
      setReviewText('')
      setMessage('')
      setHasExistingRating(false)
      setLoadingExistingRating(true)

      const sessionId = getOrCreateSessionId()

      const { data, error } = await supabase
        .from('user_ratings')
        .select('rating, review_text')
        .eq('series_id', series.id)
        .eq('session_id', sessionId)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        console.error('Existing rating load error:', error)
        setMessage(`Could not load your previous rating: ${error.message}`)
        setLoadingExistingRating(false)
        return
      }

      if (data) {
        setRating(data.rating ?? 0)
        setReviewText(data.review_text ?? '')
        setHasExistingRating(true)
      } else {
        setRating(0)
        setReviewText('')
        setHasExistingRating(false)
      }

      setLoadingExistingRating(false)
    }

    loadExistingRating()

    return () => {
      cancelled = true
    }
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

    setMessage(hasExistingRating ? 'Your rating has been updated.' : 'Your rating has been saved.')
    setHasExistingRating(true)

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
        padding: '12px',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#111',
          color: '#fff',
          width: 'min(900px, 100%)',
          maxHeight: '92vh',
          overflowY: 'auto',
          borderRadius: '16px',
          padding: '16px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1rem',
            flexWrap: 'wrap',
            marginBottom: '1rem',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 'clamp(1.4rem, 4vw, 2rem)',
              lineHeight: 1.2,
            }}
          >
            {series.name}
          </h2>

          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
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

        {providers.length > 0 && (
          <p>
            <strong>Watch on:</strong> {providers.join(', ')}
          </p>
        )}

        <p style={{ lineHeight: 1.5 }}>{series.overview}</p>

        <h3>Rate this show</h3>

        {loadingExistingRating && <p>Loading your previous rating...</p>}

        {hasExistingRating && (
          <p style={{ color: '#ffd166', marginBottom: '8px' }}>
            Your previous rating: {rating}★
          </p>
        )}

        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '12px',
            flexWrap: 'wrap',
          }}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              disabled={loadingExistingRating || saving}
              style={{
                fontSize: '1.8rem',
                background: 'transparent',
                border: 'none',
                cursor: loadingExistingRating || saving ? 'default' : 'pointer',
                color: star <= rating ? '#ffd166' : '#666',
                opacity: loadingExistingRating || saving ? 0.7 : 1,
                padding: 0,
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
          disabled={loadingExistingRating || saving}
          style={{
            width: '100%',
            marginBottom: '10px',
            boxSizing: 'border-box',
            padding: '0.75rem',
            borderRadius: '8px',
          }}
        />

        <button
          onClick={saveRating}
          disabled={!rating || saving || loadingExistingRating}
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: 'none',
            cursor: !rating || saving || loadingExistingRating ? 'default' : 'pointer',
          }}
        >
          {saving ? 'Saving...' : 'Save my rating'}
        </button>

        {message && <p>{message}</p>}
      </div>
    </div>
  )
}