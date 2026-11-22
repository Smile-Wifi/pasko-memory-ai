import { sb } from "../lib/supabaseAdmin.js";
import { STYLES, buildPrompt } from "../lib/styles.js";
import { renderPortrait } from "../lib/muse.js";

export default async function handler(req, res) {
  const { orderId, token } = req.body ?? {};
  const db = sb();
  const { data: o } = await db.from("orders").select("*").eq("id", orderId).eq("token", token).single();
  if (!o) return res.status(404).json({ error: "order not found" });
  if (o.status !== "paid" && process.env.DEV_FREE_RENDER !== "1") return res.status(402).json({ error: "payment required" });

  const { data: done } = await db.from("photos").select("style_id").eq("order_id", o.id);
  const have = new Set((done ?? []).map(r => r.style_id));
  const missing = STYLES.filter(s => !have.has(s.id));
  if (!missing.length) { await db.from("orders").update({ render_status: "ready" }).eq("id", o.id); return res.json({ rendered: 0, total: have.size }); }

  const stale = !o.render_lock_at || Date.now() - new Date(o.render_lock_at).getTime() > 300_000;
  if (o.render_status === "rendering" && !stale) return res.status(202).json({ alreadyRunning: true });
  await db.from("orders").update({ render_status: "rendering", render_lock_at: new Date().toISOString() }).eq("id", o.id);

  const { data: blob, error: dl } = await db.storage.from("uploads").download(o.photo_path);
  if (dl) return res.status(500).json({ error: "source photo missing" });
  const ref = `data:${blob.type || "image/jpeg"};base64,${Buffer.from(await blob.arrayBuffer()).toString("base64")}`;

  const results = await Promise.allSettled(missing.map(async (s) => {
    const img = await renderPortrait({ prompt: buildPrompt(s), ref });
    const path = `${o.id}/${s.id}.webp`;
    const up = await db.storage.from("renders").upload(path, img.buffer, { contentType: img.mime, upsert: true });
    if (up.error) throw new Error(up.error.message);
    await db.from("photos").upsert({ order_id: o.id, style_id: s.id, storage_path: path, cost_usd: img.cost }, { onConflict: "order_id,style_id" });
    return s.id;
  }));

  const ok = results.filter(r => r.status === "fulfilled").length;
  const total = have.size + ok;
  await db.from("orders").update({ render_status: total >= STYLES.length ? "ready" : "partial", render_lock_at: null }).eq("id", o.id);
  res.json({ rendered: ok, total, errors: results.filter(r => r.status === "rejected").map(r => String(r.reason?.message)) });
}