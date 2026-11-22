import { sb } from "../lib/supabaseAdmin.js";
export default async function handler(req, res) {
  const { ext = "jpg", bytes = 0 } = req.body ?? {};
  if (!["jpg","jpeg","png","webp"].includes(String(ext).toLowerCase())) return res.status(400).json({ error: "JPG/PNG/WEBP only" });
  if (bytes > 10_000_000) return res.status(400).json({ error: "Max 10 MB" });
  const path = `${crypto.randomUUID()}.${ext}`;
  const { data, error } = await sb().storage.from("uploads").createSignedUploadUrl(path);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ path, token: data.token });
}