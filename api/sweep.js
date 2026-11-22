import { sb } from "../lib/supabaseAdmin.js";
import { renderOrder } from "../lib/renderOrder.js";
import { buildVideo } from "../lib/buildVideo.js";

const BUDGET_MS  = 180_000;   // stop starting new work after 3 min (Hobby limit is 300s)
const MAX_ORDERS = 3;

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`)
    return res.status(401).json({ error: "unauthorized" });

  const started = Date.now();
  const db = sb();
  const out = { renders: [], videos: [], deferred: 0 };

  const { data: photoJobs, error: e1 } = await db.rpc("pending_render_orders", { p_limit: MAX_ORDERS });
  if (e1) return res.status(500).json({ error: e1.message });
  for (const row of photoJobs ?? []) {
    if (Date.now() - started > BUDGET_MS) { out.deferred++; continue; }
    out.renders.push(await renderOrder(row.id));
  }

  const { data: videoJobs, error: e2 } = await db.rpc("pending_video_orders", { p_limit: MAX_ORDERS });
  if (e2) return res.status(500).json({ error: e2.message });
  for (const row of videoJobs ?? []) {
    if (Date.now() - started > BUDGET_MS) { out.deferred++; continue; }
    out.videos.push(await buildVideo(row.id));
  }

  res.status(200).json({ ok: true, ms: Date.now() - started, ...out });
}