// Vercel Serverless Function: single-user progress store
// GET  /api/progress  -> returns saved progress JSON (or null)
// POST /api/progress  -> body = progress JSON, saves it
// Uses Upstash Redis REST API. Env vars provided by Vercel integration.

const URL =
  process.env.KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.REDIS_URL;
const TOKEN =
  process.env.KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.REDIS_TOKEN;

const KEY = "korean-audio:progress";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function redis(command) {
  const r = await fetch(URL, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!r.ok) throw new Error("redis " + r.status);
  const j = await r.json();
  return j.result;
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (!URL || !TOKEN) {
    res.status(500).json({ error: "storage not configured" });
    return;
  }
  try {
    if (req.method === "GET") {
      const val = await redis(["GET", KEY]);
      res.status(200).json({ ok: true, data: val ? JSON.parse(val) : null });
      return;
    }
    if (req.method === "POST") {
      let body = req.body;
      if (typeof body === "string") {
        try { body = JSON.parse(body); } catch (e) { body = null; }
      }
      if (body == null) {
        res.status(400).json({ error: "invalid body" });
        return;
      }
      await redis(["SET", KEY, JSON.stringify(body)]);
      res.status(200).json({ ok: true });
      return;
    }
    res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
};
