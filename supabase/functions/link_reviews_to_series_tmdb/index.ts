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

type TMDbMovie = {
  id: number;
  title?: string;
  original_title?: string;
  release_date?: string;
  overview?: string;
  poster_path?: string | null;
  genre_ids?: number[];
};

function cleanTitle(raw: string): string {
  if (!raw) return "";

  let title = raw.trim();

  // Remove common Guardian review suffixes
  title = title.replace(/\s+first look review\s*[–-].*$/i, "");
  title = title.replace(/\s+final season review\s*[–-].*$/i, "");
  title = title.replace(/\s+celebrity special review\s*[–-].*$/i, "");
  title = title.replace(/\s+special review\s*[–-].*$/i, "");
  title = title.replace(/\s+finale review\s*[–-].*$/i, "");
  title = title.replace(/\s+final review\s*[–-].*$/i, "");
  title = title.replace(/\s+review\s*[–-].*$/i, "");

  // If headline still contains "review", strip everything after it
  title = title.replace(/\s+review\b.*$/i, "");

  // Remove trailing punctuation / spaces
  title = title.replace(/[“”"'’:\-–—\s]+$/g, "").trim();

  return title;
}

function buildCandidates(cleanedTitle: string): string[] {
  const candidates: string[] = [];

  function addCandidate(value: string) {
    const v = value.trim();
    if (v && !candidates.includes(v)) {
      candidates.push(v);
    }
  }

  addCandidate(cleanedTitle);

  // Colon fallback
  if (cleanedTitle.includes(":")) {
    addCandidate(cleanedTitle.split(":")[0]);
  }

  // Remove leading "The"
  const noThe = cleanedTitle.replace(/^the\s+/i, "").trim();
  if (noThe && noThe !== cleanedTitle) {
    addCandidate(noThe);
  }

  // Remove common suffixes that may refer to episodes/specials rather than base series
  addCandidate(
    cleanedTitle
      .replace(/\bfinale\b/i, "")
      .replace(/\bfinal season\b/i, "")
      .replace(/\bfinal\b/i, "")
      .replace(/\bcelebrity special\b/i, "")
      .replace(/\bspecial\b/i, "")
      .trim()
  );

  return candidates.filter(Boolean);
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

async function tmdbSearchMovie(query: string, tmdbKey: string): Promise<TMDbMovie | null> {
  const url = new URL("https://api.themoviedb.org/3/search/movie");
  url.searchParams.set("api_key", tmdbKey);
  url.searchParams.set("query", query);

  const res = await fetch(url.toString());
  if (!res.ok) return null;

  const json = await res.json();
  const results: TMDbMovie[] = json?.results ?? [];
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

    const body = await req.json().catch(() => ({}));
    const limit = typeof body?.limit === "number" && body.limit > 0 ? body.limit : 100;

    // Load TV genre map once
    const tvGenreJson = await tmdbFetch("/genre/tv/list", TMDB_API_KEY);
    const tvGenreMap = new Map<number, string>();
    for (const g of (tvGenreJson?.genres ?? [])) {
      tvGenreMap.set(g.id, g.name);
    }

    // Load movie genre map once
    const movieGenreJson = await tmdbFetch("/genre/movie/list", TMDB_API_KEY);
    const movieGenreMap = new Map<number, string>();
    for (const g of (movieGenreJson?.genres ?? [])) {
      movieGenreMap.set(g.id, g.name);
    }

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

    const unmatchedSample: Array<{
      review_id: number;
      rawTitle: string;
      candidates: string[];
    }> = [];

    for (const r of reviews ?? []) {
      processed++;

      const rawTitle = (r.title_as_printed ?? r.review_title ?? "").toString().trim();
      if (!rawTitle) {
        skippedNoTitle++;
        continue;
      }

      const cleanedTitle = cleanTitle(rawTitle);
      const candidates = buildCandidates(cleanedTitle);

      let matchedKind: "tv" | "movie" | null = null;
      let matched: TMDbTV | TMDbMovie | null = null;

      for (const candidate of candidates) {
        const tv = await tmdbSearchTV(candidate, TMDB_API_KEY);
        if (tv) {
          matched = tv;
          matchedKind = "tv";
          break;
        }

        const movie = await tmdbSearchMovie(candidate, TMDB_API_KEY);
        if (movie) {
          matched = movie;
          matchedKind = "movie";
          break;
        }
      }

      if (!matched || !matchedKind) {
        skippedNoTmdb++;
        if (unmatchedSample.length < 20) {
          unmatchedSample.push({
            review_id: r.id,
            rawTitle,
            candidates,
          });
        }
        continue;
      }

      tmdbMatched++;

      const genreMap = matchedKind === "tv" ? tvGenreMap : movieGenreMap;

      const genres = (matched.genre_ids ?? [])
        .map((id) => genreMap.get(id))
        .filter(Boolean)
        .join(", ") || null;

      const firstAirYear =
        matchedKind === "tv"
          ? (matched as TMDbTV).first_air_date
            ? Number((matched as TMDbTV).first_air_date!.slice(0, 4))
            : null
          : (matched as TMDbMovie).release_date
            ? Number((matched as TMDbMovie).release_date!.slice(0, 4))
            : null;

      const country =
        matchedKind === "tv"
          ? (matched as TMDbTV).origin_country?.length
            ? (matched as TMDbTV).origin_country!.join(", ")
            : null
          : null;

      const displayName =
        matchedKind === "tv"
          ? (matched as TMDbTV).name ?? (matched as TMDbTV).original_name ?? cleanedTitle
          : (matched as TMDbMovie).title ?? (matched as TMDbMovie).original_title ?? cleanedTitle;

      const seriesPayload = {
        tmdb_id: `${matchedKind}:${matched.id}`,
        original_title: cleanedTitle,
        name: displayName,
        first_air_year: firstAirYear,
        country,
        genres,
        overview: matched.overview ?? null,
        poster_url: posterUrlFromPath(matched.poster_path),
      };

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
        unmatchedSample,
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