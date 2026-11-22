import fs from "node:fs/promises";
import path from "node:path";
import { STYLES, buildPrompt } from "../lib/styles.js";

const file = process.argv[2], key = process.env.MODEL_API_KEY;
if (!file || !key) { console.error("Set MODEL_API_KEY, then: node scripts/test-render.mjs photo.jpg"); process.exit(1); }
const mime = { ".jpg":"image/jpeg",".jpeg":"image/jpeg",".png":"image/png",".webp":"image/webp" }[path.extname(file).toLowerCase()] ?? "image/jpeg";
const ref = `data:${mime};base64,${(await fs.readFile(file)).toString("base64")}`;
await fs.mkdir("out", { recursive: true });

const t0 = Date.now();
const results = await Promise.allSettled(STYLES.map(async (s) => {
  const r = await fetch("https://api.meta.ai/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "muse-image-1.0", prompt: buildPrompt(s), images: [{ image_url: ref }], n: 1, size: "1024x1536" }),
  });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
  const b64 = (await r.json()).data?.[0]?.b64_json;
  if (!b64) throw new Error("no image in response");
  await fs.writeFile(`out/${s.id}.webp`, Buffer.from(b64, "base64"));
  return s.id;
}));
results.forEach((r, i) => console.log(r.status === "fulfilled" ? `OK  ${r.value}` : `FAIL ${STYLES[i].id}: ${r.reason.message}`));
console.log(`${((Date.now()-t0)/1000).toFixed(1)}s · ~$${(results.filter(r=>r.status==="fulfilled").length*0.01).toFixed(2)}`);