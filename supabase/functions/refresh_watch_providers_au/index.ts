// supabase/functions/refresh_watch_providers_au/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TMDB_API_KEY = Deno.env.get("TMDB_API_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function uniqNames(arr: any[] | undefined) {
  if (!arr || !Array.isArray(arr)) return [];
  const names = arr
    .map((p) => p?.provider_name)
    .filter((x) => typeof x === "string" && x.length > 0);
  return Array.from(new Set(names));
}

async function fetchProvidersAU(tmdbId: string) {
  const url = `https://api.themoviedb.org/3/tv/${encodeURIComponent(
    tmdbId,
  )}/watch/providers?api_key=${encodeURIComponent(TMDB_API_KEY)}`;

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TMDb providers failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  const au = json?.results?.AU;

  // au can be undefined if TMDb has no AU provider data
  const payload = {
    country: "AU",
    source: "tmdb",
    flatrate: uniqNames(au?.flatrate),
    rent: uniqNames(au?.rent),
    buy: uniqNames(au?.buy),
  };

  return payload;
}

serve(async (req) => {
  try {
    const { limit = 200 } = await req.json().catch(() => ({}));

    // Pull series that have tmdb_id (and optionally skip ones updated recently)
    const { data: rows, error } = await supabase
      .from("series")
      .select("id, tmdb_id")
      .not("tmdb_id", "is", null)
      .limit(limit);

    if (error) throw error;
    if (!rows || rows.length === 0) {
      return Response.json({ ok: true, processed: 0, updated: 0 });
    }

    let updated = 0;
    let noAUData = 0;

    for (const row of rows) {
      const tmdbId = String(row.tmdb_id);

      const providers = await fetchProvidersAU(tmdbId);
      if (
        providers.flatrate.length === 0 &&
        providers.rent.length === 0 &&
        providers.buy.length === 0
      ) {
        noAUData++;
      }

      const { error: updErr } = await supabase
        .from("series")
        .update({
          watch_providers_au: providers,
          watch_last_checked_at_au: new Date().toISOString(),
        })
        .eq("id", row.id);

      if (updErr) throw updErr;
      updated++;
    }

    return Response.json({
      ok: true,
      stage: "done",
      processed: rows.length,
      updated,
      noAUData,
    });
  } catch (e) {
    return Response.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 },
    );
  }
});
