import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type TMDbTV = {
  id: number;
  name?: string;
  original_name?: string;
  first_air_date?: string;
  origin_country?: string[];
  overview?: string;
  poster_path?: string | null;
  genre_ids?: number[];
};

function cleanSeriesTitle(raw: string): string {
  if (!raw) return "";
  let s = raw.trim();

  // Common Guardian patterns: "X review – ..." / "X review - ..." / "X: review – ..."
  const lowered = s.toLowerCase();
  const cutMarkers = [" review –", " review -", " – review", ": review", " review:"];
  for (const m of cutMarkers) {
    const idx = lowered.indexOf(m);
    if (idx !== -1) {
      s = s.slice(0, idx).trim();
      break;
    }
  }

  // Remove trailing punctuation/whitespace
  s = s.replace(/\s+/g, " ").replace(/[–—:-]\s*$/g, "").trim();

  // A few light normalisations
  s = s.replace(/\s+series\s+\d+$/i, "").trim(); // e.g. "Foo series 2"
  s = s.replace(/\s+season\s+\d+$/i, "").trim(); // e.g. "Foo season five"

  return s;
}

async function tmdbFetch(path: string, tmdbKey: string): Promise<any> {
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  url.searchParams.set("api_key", tmdbKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`TMDb ${res.status}: ${await res.text()}`);
  }
  return await res.json();
}

async function tmdbSearchTV(query: string, tmdbKey: string): Promise<TMDbTV | null> {
  const url = new URL("https://api.themoviedb.org/3/search/tv");
  url.searchParams.set("api_key", tmdbKey);
  url.searchParams.set("query", query);

  const res = await fetch(url.toString());
  if (!res.ok) return null;

  const json = await res.json();
  const results: TMDbTV[] = json?.results ?? [];
  return results.length ? results[0] : null;
}

function posterUrlFromPath(poster_path: string | null | undefined): string | null {
  if (!poster_path) return null;
  return `https://image.tmdb.org/t/p/w500${poster_path}`;
}

serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const TMDB_API_KEY = Deno.env.get("TMDB_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !TMDB_API_KEY) {
      return new Response(
        JSON.stringify({
          ok: false,
          stage: "env",
          missing: {
            SUPABASE_URL: !SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY: !SUPABASE_SERVICE_ROLE_KEY,
            TMDB_API_KEY: !TMDB_API_KEY,
          },
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Body options
    const body = await req.json().catch(() => ({}));
    const limit = typeof body?.limit === "number" && body.limit > 0 ? body.limit : 50;

    // Load TMDb genre map once
    const genreJson = await tmdbFetch("/genre/tv/list", TMDB_API_KEY);
    const genreMap = new Map<number, string>();
    for (const g of (genreJson?.genres ?? [])) genreMap.set(g.id, g.name);

    // Fetch reviews that are not linked to a series yet
    const { data: reviews, error: reviewsErr } = await supabase
      .from("reviews")
      .select("id, review_title, title_as_printed, guardian_url, guardian_stars, publication_date, series_id")
      .is("series_id", null)
      .order("publication_date", { ascending: false })
      .limit(limit);

    if (reviewsErr) {
      return new Response(
        JSON.stringify({ ok: false, stage: "select_reviews", message: reviewsErr.message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    let processed = 0;
    let tmdbMatched = 0;
    let seriesUpserted = 0;
    let reviewsLinked = 0;
    let skippedNoTitle = 0;
    let skippedNoTmdb = 0;

    for (const r of reviews ?? []) {
      processed++;

      const rawTitle = (r.title_as_printed ?? r.review_title ?? "").toString().trim();
      const candidate = cleanSeriesTitle(rawTitle);

      if (!candidate) {
        skippedNoTitle++;
        continue;
      }

      const tv = await tmdbSearchTV(candidate, TMDB_API_KEY);
      if (!tv?.id) {
        skippedNoTmdb++;
        continue;
      }

      tmdbMatched++;

      const genres = (tv.genre_ids ?? [])
        .map((id) => genreMap.get(id))
        .filter(Boolean)
        .join(", ") || null;

      const firstAirYear = tv.first_air_date ? Number(tv.first_air_date.slice(0, 4)) : null;
      const country = tv.origin_country?.length ? tv.origin_country.join(", ") : null;

      const seriesPayload = {
        // You already created these columns in series
        tmdb_id: String(tv.id),
        original_title: candidate,
        name: tv.name ?? tv.original_name ?? candidate,
        first_air_year: firstAirYear,
        country,
        genres,
        overview: tv.overview ?? null,
        poster_url: posterUrlFromPath(tv.poster_path),
      };

      // Upsert series row by tmdb_id
      // IMPORTANT: This works best if series.tmdb_id has a UNIQUE constraint.
      const { data: upserted, error: upsertErr } = await supabase
        .from("series")
        .upsert(seriesPayload, { onConflict: "tmdb_id" })
        .select("id")
        .single();

      if (upsertErr) {
        return new Response(
          JSON.stringify({
            ok: false,
            stage: "upsert_series",
            message: upsertErr.message,
            hint:
              "If this says there is no unique constraint for tmdb_id, add a UNIQUE constraint on series.tmdb_id.",
          }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }

      seriesUpserted++;

      // Link the review to the series
      const { error: linkErr } = await supabase
        .from("reviews")
        .update({ series_id: upserted.id })
        .eq("id", r.id);

      if (linkErr) {
        return new Response(
          JSON.stringify({ ok: false, stage: "link_review", message: linkErr.message }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }

      reviewsLinked++;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        stage: "done",
        limit,
        processed,
        tmdbMatched,
        seriesUpserted,
        reviewsLinked,
        skippedNoTitle,
        skippedNoTmdb,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, stage: "exception", error: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
