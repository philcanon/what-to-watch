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

    setMessage(
      hasExistingRating
        ? 'Your rating has been updated.'
        : 'Your rating has been saved.'
    )
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
        background: 'rgba(15, 23, 42, 0.68)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '14px',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          color: '#1f2937',
          width: 'min(900px, 100%)',
          maxHeight: '92vh',
          overflowY: 'auto',
          borderRadius: '22px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
          border: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <div
          style={{
            padding: '20px 20px 0 20px',
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
            <div style={{ flex: '1 1 320px' }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: 'clamp(1.5rem, 4vw, 2.2rem)',
                  lineHeight: 1.15,
                  letterSpacing: '-0.02em',
                  color: '#111827',
                }}
              >
                {series.name}
              </h2>

              <p
                style={{
                  margin: '8px 0 0 0',
                  color: '#6b7280',
                  fontSize: '0.95rem',
                }}
              >
                {series.first_air_year || 'Year unknown'}
              </p>
            </div>

            <button
              onClick={onClose}
              style={{
                padding: '0.7rem 1rem',
                borderRadius: '999px',
                border: '1px solid #d1d5db',
                background: '#f9fafb',
                color: '#374151',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Close
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.75rem',
              marginBottom: '1rem',
            }}
          >
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e5e7eb',
                borderRadius: '14px',
                padding: '12px 14px',
              }}
            >
              <div
                style={{
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  color: '#6b7280',
                  marginBottom: '4px',
                }}
              >
                Guardian
              </div>
              <div
                style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#111827',
                }}
              >
                {starsFromAvg(series.guardian_avg_stars)}
              </div>
            </div>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e5e7eb',
                borderRadius: '14px',
                padding: '12px 14px',
              }}
            >
              <div
                style={{
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  color: '#6b7280',
                  marginBottom: '4px',
                }}
              >
                Users
              </div>
              <div
                style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#111827',
                }}
              >
                {series.user_avg_rating
                  ? `${Number(series.user_avg_rating).toFixed(1)}★ (${series.user_rating_count || 0})`
                  : 'Not yet rated'}
              </div>
            </div>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e5e7eb',
                borderRadius: '14px',
                padding: '12px 14px',
              }}
            >
              <div
                style={{
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  color: '#6b7280',
                  marginBottom: '4px',
                }}
              >
                Watch
              </div>
              <div
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: '#111827',
                  lineHeight: 1.4,
                }}
              >
                {providers.length > 0 ? providers.join(', ') : 'Not listed'}
              </div>
            </div>
          </div>

          <div
            style={{
              marginBottom: '1.25rem',
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '16px',
              padding: '16px',
            }}
          >
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                color: '#6b7280',
                marginBottom: '8px',
              }}
            >
              Overview
            </div>

            <p
              style={{
                margin: 0,
                lineHeight: 1.65,
                color: '#374151',
                fontSize: '0.98rem',
              }}
            >
              {series.overview || 'No overview available.'}
            </p>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid #e5e7eb',
            padding: '18px 20px 20px 20px',
            background: '#fcfcfd',
          }}
        >
          <h3
            style={{
              margin: '0 0 10px 0',
              fontSize: '1.1rem',
              color: '#111827',
            }}
          >
            Rate this show
          </h3>

          {loadingExistingRating && (
            <p style={{ color: '#6b7280', marginTop: 0 }}>
              Loading your previous rating...
            </p>
          )}

          {hasExistingRating && !loadingExistingRating && (
            <p
              style={{
                color: '#9a6700',
                background: '#fff7d6',
                border: '1px solid #f3df8a',
                borderRadius: '12px',
                padding: '10px 12px',
                marginTop: 0,
                marginBottom: '12px',
                fontSize: '0.95rem',
              }}
            >
              Your previous rating: {rating}★
            </p>
          )}

          <div
            style={{
              display: 'flex',
              gap: '10px',
              marginBottom: '14px',
              flexWrap: 'wrap',
            }}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                disabled={loadingExistingRating || saving}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  border: star === rating ? '1px solid #f2c94c' : '1px solid #e5e7eb',
                  background: star <= rating ? '#fff6d8' : '#ffffff',
                  cursor: loadingExistingRating || saving ? 'default' : 'pointer',
                  color: star <= rating ? '#d4a017' : '#9ca3af',
                  fontSize: '1.6rem',
                  lineHeight: 1,
                  opacity: loadingExistingRating || saving ? 0.7 : 1,
                  transition: 'all 0.15s ease',
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
              marginBottom: '12px',
              boxSizing: 'border-box',
              padding: '0.9rem',
              borderRadius: '14px',
              border: '1px solid #d1d5db',
              fontSize: '0.96rem',
              lineHeight: 1.5,
              resize: 'vertical',
              background: '#fff',
              color: '#111827',
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={saveRating}
              disabled={!rating || saving || loadingExistingRating}
              style={{
                padding: '0.85rem 1.1rem',
                borderRadius: '999px',
                border: 'none',
                background:
                  !rating || saving || loadingExistingRating ? '#d1d5db' : '#111827',
                color: '#fff',
                fontWeight: 700,
                cursor:
                  !rating || saving || loadingExistingRating ? 'default' : 'pointer',
              }}
            >
              {saving ? 'Saving...' : 'Save my rating'}
            </button>

            {message && (
              <p
                style={{
                  margin: 0,
                  color: '#374151',
                  fontSize: '0.95rem',
                }}
              >
                {message}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}