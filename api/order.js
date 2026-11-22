import { sb } from "../lib/supabaseAdmin.js";
import { STYLES } from "../lib/styles.js";
export default async function handler(req, res) {
  const { id, token } = req.query;
  const db = sb();
  const { data: o } = await db.from("orders").select("id,status,render_status,pkg").eq("id", id).eq("token", token).single();
  if (!o) return res.status(404).json({ error: "not found" });
  const { data: ph } = await db.from("photos").select("style_id,storage_path").eq("order_id", o.id);
  const { data: urls } = ph?.length ? await db.storage.from("renders").createSignedUrls(ph.map(p => p.storage_path), 3600) : { data: [] };
  res.json({ ...o, expected: STYLES.length,
    photos: (ph ?? []).map((p, i) => ({ styleId: p.style_id, name: STYLES.find(s => s.id === p.style_id)?.name, url: urls?.[i]?.signedUrl })) });
}