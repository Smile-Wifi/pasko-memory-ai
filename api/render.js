import { sb } from "../lib/supabaseAdmin.js";
import { renderOrder } from "../lib/renderOrder.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const { orderId, token } = req.body ?? {};
  if (!orderId || !token) return res.status(400).json({ error: "orderId and token required" });

  const db = sb();
  const { data: o } = await db.from("orders")
    .select("id,render_attempts").eq("id", orderId).eq("token", token).single();
  if (!o) return res.status(404).json({ error: "order not found" });

  // customer pressing Retry gets one more chance, hard-capped at 8 total attempts
  if (o.render_attempts >= 5 && o.render_attempts < 8)
    await db.from("orders").update({ render_attempts: 4 }).eq("id", o.id);

  const result = await renderOrder(o.id);
  res.status(result.skipped ? 202 : 200).json(result);
}