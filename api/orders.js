import { sb } from "../lib/supabaseAdmin.js";
const PACKAGES = { basic: 9900, premium: 14900 };   // server-side truth, centavos
export default async function handler(req, res) {
  const { pkg, name, email, phone, photoPath, consent } = req.body ?? {};
  if (!PACKAGES[pkg] || !name || !email || !photoPath || consent !== true)
    return res.status(400).json({ error: "invalid order" });
  const dev = process.env.DEV_FREE_RENDER === "1";
  const { data, error } = await sb().from("orders").insert({
    pkg, amount_centavos: PACKAGES[pkg], customer_name: name, email, phone,
    photo_path: photoPath, consent, status: dev ? "paid" : "pending",
  }).select("id,token,status").single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ orderId: data.id, token: data.token, status: data.status, amount: PACKAGES[pkg] });
}