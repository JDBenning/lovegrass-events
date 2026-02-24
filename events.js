export default async function handler(req, res) {
  // Preflight for some browsers/builders
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const PAGE_ID = process.env.FB_PAGE_ID;
  const ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
  const GRAPH_VERSION = process.env.FB_GRAPH_VERSION || "v20.0";

  if (!PAGE_ID || !ACCESS_TOKEN) {
    res.status(500).json({
      ok: false,
      error: "Missing server configuration (FB_PAGE_ID / FB_PAGE_ACCESS_TOKEN)"
    });
    return;
  }

  try {
    const since = Math.floor(Date.now() / 1000);

    const fields = [
      "id",
      "name",
      "start_time",
      "end_time",
      "place",
      "cover",
      "ticket_uri"
    ].join(",");

    const url =
      `https://graph.facebook.com/${GRAPH_VERSION}/${PAGE_ID}/events` +
      `?since=${since}` +
      `&fields=${encodeURIComponent(fields)}` +
      `&limit=12` +
      `&access_token=${encodeURIComponent(ACCESS_TOKEN)}`;

    const fbRes = await fetch(url);
    const fbJson = await fbRes.json();

    if (!fbRes.ok) {
      res.status(502).json({ ok: false, error: "Meta API error", details: fbJson });
      return;
    }

    const events = (fbJson.data || []).map((e) => ({
      id: e.id,
      name: e.name || "",
      start_time: e.start_time || "",
      end_time: e.end_time || "",
      place: e.place?.name || "",
      cover: e.cover?.source || "",
      ticket_uri: e.ticket_uri || "",
      url: `https://www.facebook.com/events/${e.id}/`
    }));

    // CDN cache for 15 minutes (Vercel edge cache)
    res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=86400");
    res.status(200).json({ ok: true, updated_at: new Date().toISOString(), events });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Server error", message: String(err?.message || err) });
  }
}