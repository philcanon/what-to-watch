import React from "react";

function starsFromAvg(value) {
  if (value == null) return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  return `${num.toFixed(1)}★`;
}

function providerNames(providers) {
  if (!providers) return [];

  if (Array.isArray(providers)) {
    return providers
      .map((p) => {
        if (typeof p === "string") return p;
        return p?.provider_name ?? p?.name ?? null;
      })
      .filter(Boolean);
  }

  return [];
}

export default function SeriesModal({ series, onClose }) {
  if (!series) return null;

  const providers = providerNames(series.watch_providers_au);

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        zIndex: 1000,
      }}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#111",
          color: "#fff",
          width: "min(900px, 100%)",
          maxHeight: "90vh",
          overflowY: "auto",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
            alignItems: "flex-start",
            marginBottom: "20px",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>{series.name}</h2>
            <div style={{ opacity: 0.8, marginTop: "6px" }}>
              {series.first_air_year ?? "—"}
              {series.country ? ` • ${series.country}` : ""}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "10px",
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "220px 1fr",
            gap: "24px",
          }}
        >
          <div>
            {series.poster_url || series.poster_image ? (
              <img
                src={series.poster_url || series.poster_image}
                alt={series.name}
                style={{
                  width: "100%",
                  borderRadius: "12px",
                  display: "block",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  aspectRatio: "2 / 3",
                  background: "#222",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#aaa",
                }}
              >
                No image
              </div>
            )}
          </div>

          <div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", 
marginBottom: "16px" }}>
              <span
                style={{
                  background: "#1f1f1f",
                  padding: "8px 12px",
                  borderRadius: "999px",
                }}
              >
                Guardian: {starsFromAvg(series.guardian_avg_stars)}
              </span>

              <span
                style={{
                  background: "#1f1f1f",
                  padding: "8px 12px",
                  borderRadius: "999px",
                }}
              >
                User rating:{" "}
                {series.user_avg_rating != null
                  ? `${Number(series.user_avg_rating).toFixed(1)}★ 
(${series.user_rating_count ?? 0})`
                  : "Not yet rated"}
              </span>
            </div>

            {series.genres ? (
              <p style={{ marginTop: 0, opacity: 0.9 }}>
                <strong>Genres:</strong> {series.genres}
              </p>
            ) : null}

            {series.latest_review_date ? (
              <p style={{ opacity: 0.9 }}>
                <strong>Latest Guardian review:</strong> 
{series.latest_review_date}
              </p>
            ) : null}

            {series.overview ? (
              <>
                <h3 style={{ marginBottom: "8px" }}>Overview</h3>
                <p style={{ lineHeight: 1.6, opacity: 0.95 
}}>{series.overview}</p>
              </>
            ) : null}

            {providers.length > 0 ? (
              <>
                <h3 style={{ marginBottom: "8px" }}>Available on</h3>
                <p style={{ lineHeight: 1.6, opacity: 0.95 
}}>{providers.join(", ")}</p>
              </>
            ) : null}

            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", 
marginTop: "20px" }}>
              {series.latest_guardian_url ? (
                <a
                  href={series.latest_guardian_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: "#fff",
                    color: "#111",
                    textDecoration: "none",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    fontWeight: 600,
                  }}
                >
                  Read Guardian review
                </a>
              ) : null}

              {series.justwatch_au_link ? (
                <a
                  href={series.justwatch_au_link}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: "transparent",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.3)",
                    textDecoration: "none",
                    padding: "10px 14px",
                    borderRadius: "10px",
                  }}
                >
                  View streaming options
                </a>
              ) : null}
            </div>

            <div
              style={{
                marginTop: "28px",
                paddingTop: "20px",
                borderTop: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <h3 style={{ marginBottom: "8px" }}>User reviews</h3>
              <p style={{ opacity: 0.8, marginBottom: 0 }}>
                Coming next: star rating and short user review submission.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
