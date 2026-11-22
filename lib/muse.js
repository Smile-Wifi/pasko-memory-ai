export async function renderPortrait({ prompt, ref }) {
  if (process.env.IMAGE_PROVIDER === "openrouter") {
    const r = await fetch("https://openrouter.ai/api/v1/images", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "meta/muse-image", prompt, aspect_ratio: "2:3",
        input_references: [{ type: "image_url", image_url: { url: ref } }] }),
    });
    if (!r.ok) throw new Error(`or ${r.status}: ${(await r.text()).slice(0,200)}`);
    const j = await r.json();
    return { buffer: Buffer.from(j.data[0].b64_json, "base64"), mime: j.data[0].media_type || "image/png", cost: j.usage?.cost ?? 0.01 };
  }
  const r = await fetch("https://api.meta.ai/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.MODEL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "muse-image-1.0", prompt, images: [{ image_url: ref }], n: 1, size: "1024x1536" }),
  });
  if (!r.ok) throw new Error(`muse ${r.status}: ${(await r.text()).slice(0,200)}`);
  const j = await r.json();
  if (!j.data?.[0]?.b64_json) throw new Error("muse: empty result");
  return { buffer: Buffer.from(j.data[0].b64_json, "base64"), mime: "image/webp", cost: 0.01 };
}