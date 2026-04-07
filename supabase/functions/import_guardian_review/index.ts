import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const GUARDIAN_API_KEY = Deno.env.get("GUARDIAN_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GUARDIAN_API_KEY) {
      return new Response(
        JSON.stringify({
          ok: false,
          stage: "env",
          missing: {
            SUPABASE_URL: !SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY: !SUPABASE_SERVICE_ROLE_KEY,
            GUARDIAN_API_KEY: !GUARDIAN_API_KEY,
          },
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const days =
      typeof body?.days === "number" && body.days > 0 ? body.days : 3650;
    const pages =
      typeof body?.pages === "number" && body.pages > 0 ? body.pages : 5;

    const now = new Date();
    const toDate = now.toISOString().slice(0, 10);
    const fromDate = new Date(now.getTime() - days * 86400000)
      .toISOString()
      .slice(0, 10);

    let guardianResults = 0;
    let inserted = 0;
    let skippedLowStars = 0;
    const allRows: any[] = [];

    for (let page = 1; page <= pages; page++) {
      const gUrl = new URL("https://content.guardianapis.com/search");
      gUrl.searchParams.set("section", "tv-and-radio");
      gUrl.searchParams.set("from-date", fromDate);
      gUrl.searchParams.set("to-date", toDate);
      gUrl.searchParams.set("order-by", "newest");
      gUrl.searchParams.set("page-size", "50");
      gUrl.searchParams.set("page", String(page));
      gUrl.searchParams.set("show-fields", "starRating,headline,byline");
      gUrl.searchParams.set("api-key", GUARDIAN_API_KEY);

      const gRes = await fetch(gUrl.toString());
      if (!gRes.ok) {
        return new Response(
          JSON.stringify({
            ok: false,
            stage: "guardian_fetch",
            page,
            status: gRes.status,
            body: await gRes.text(),
          }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }

      const gJson = await gRes.json();
      const results: any[] = gJson?.response?.results ?? [];
      guardianResults += results.length;

      for (const r of results) {
        const starsRaw = r?.fields?.starRating;
        const stars = starsRaw ? Number(starsRaw) : null;

        if (!stars || stars < 4) {
          skippedLowStars++;
          continue;
        }

        allRows.push({
          series_id: null,
          review_title: r?.fields?.headline || r?.webTitle,
          guardian_stars: stars,
          guardian_url: r?.webUrl,
          publication_date: (r?.webPublicationDate ?? "").slice(0, 10) || null,
          reviewer: r?.fields?.byline ?? null,
          source_tag: "guardian",
          title_as_printed: r?.webTitle ?? null,
        });
      }
    }

    if (allRows.length === 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          stage: "no_rows",
          fromDate,
          toDate,
          pages,
          guardian_results: guardianResults,
          inserted: 0,
          skippedLowStars,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const { error } = await supabase
  .from("reviews")
  .upsert(allRows, { onConflict: "guardian_url" });

    if (error) {
      return new Response(
        JSON.stringify({
          ok: false,
          stage: "supabase_insert",
          message: error.message,
          details: error.details ?? null,
          hint: error.hint ?? null,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    inserted = allRows.length;

    return new Response(
      JSON.stringify({
        ok: true,
        stage: "done",
        fromDate,
        toDate,
        pages,
        guardian_results: guardianResults,
        inserted,
        skippedLowStars,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({
        ok: false,
        stage: "exception",
        error: String(e),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});