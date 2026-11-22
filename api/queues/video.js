import { sb } from "../lib/supabaseAdmin.js";
import { buildVideo } from "../lib/buildVideo.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const { orderId, token } = req.body ?? {};
  if (!orderId || !token) return res.status(400).json({ error: "orderId and token required" });

  const db = sb();
  const { data: o } = await db.from("orders")
    .select("id,video_attempts").eq("id", orderId).eq("token", token).single();
  if (!o) return res.status(404).json({ error: "order not found" });

  if (o.video_attempts >= 3 && o.video_attempts < 5)
    await db.from("orders").update({ video_attempts: 2 }).eq("id", o.id);

  const result = await buildVideo(o.id);
  res.status(result.skipped ? 202 : 200).json(result);
}