// api/generate.js - PASKO 5 TEMPLATES - TEST = FULL 5 + VIDEO
// Flow: Upload -> Package -> Auto 5 templates -> Generate
// P99 = 5 photos, P149 = 5 photos + auto 30s slideshow
// TEST button now renders ALL 5 + video, same as real order, just free
export const config = { maxDuration: 60 };
const META_IMAGE_URL = "https://api.meta.ai/v1/images/generations";

const SUFFIX = "different from the original photo pose and camera angle; keep the exact same person's face, identity, hairstyle and smile, photorealistic. Keep the same number of people. No text or watermark.";

const TEMPLATES = [
  { id: "simbang-gabi", name: "Simbang Gabi", desc: "A warm Filipino Christmas tradition", prompt: `warm Simbang Gabi Christmas portrait, Filipino church at dawn, warm parol lanterns, festive lights. new pose: standing in three-quarter view at the church entrance, hands gently clasped in front, looking at the camera, full upper body, ${SUFFIX}` },
  { id: "snow", name: "Snow", desc: "A cozy winter wonderland", prompt: `cozy winter wonderland, soft falling snow, warm coat and scarf, Christmas tree bokeh lights. new pose: walking toward the camera mid-step in the snow, one hand holding the scarf, head slightly tilted, three-quarter body shot, ${SUFFIX}` },
  { id: "pajama", name: "Pajama", desc: "A relaxed family Christmas at home", prompt: `relaxed family Christmas at home, matching Christmas pajamas, cozy living room with Christmas tree. new pose: sitting cross-legged on the floor beside the Christmas tree holding a wrapped gift, relaxed and leaning slightly forward, ${SUFFIX}` },
  { id: "street", name: "Street Celebration", desc: "Bright lights and festive nights", prompt: `bright Filipino street Christmas celebration, colorful lights, night street, parol lanterns, festive bokeh. new pose: candid laughing pose, holding a glowing parol lantern up beside the shoulder, body turned sideways, face toward the camera, ${SUFFIX}` },
  { id: "barong", name: "Traditional / Barong", desc: "An elegant holiday portrait", prompt: `elegant traditional Filipino holiday portrait, wearing elegant barong / Filipiniana, formal studio with gold Christmas lights. new pose: formal standing pose, straight posture, one hand resting on a chair back, full body portrait, ${SUFFIX}` }
];

async function generateMetaImage(prompt, size = "1024x1024") {
  const apiKey = process.env["MODEL_API_KEY"];
  if (!apiKey) throw new Error("MODEL_API_KEY is missing in Vercel. Run: vercel env add MODEL_API_KEY production");
  const response = await fetch(META_IMAGE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "muse-image-1.0", prompt, size, n: 1, output_format: "png" }),
  });
  const text = await response.text();
  console.log("Muse status:", response.status);
  if (!response.ok) throw new Error(`Muse failed ${response.status}: ${text.slice(0, 800)}`);
  const data = JSON.parse(text);
  const first = data.data?.[0] || data.images?.[0] || {};
  const b64 = first.b64_json || first.image_base64 || data.b64_json;
  const url = first.url || first.image_url || data.url;
  if (b64) return `data:image/png;base64,${b64}`;
  if (url) return url;
  throw new Error(`Muse returned no image. Raw: ${text.slice(0, 1000)}`);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { packageId, reference, isTest } = req.body || {};
    const isPremium = packageId === 'premium';
    // TEST = ALL 5 TOO - no more 1-photo shortcut
    const toGenerate = TEMPLATES;
    let images = [];
    for (const t of toGenerate) {
      const img = await generateMetaImage(t.prompt, "1024x1024");
      images.push({ id: t.id, name: t.name, desc: t.desc, image: img });
    }
    return res.status(200).json({
      success: true, isTest: !!isTest, reference: reference || '',
      packageId: packageId || 'basic',
      packageName: isPremium ? 'Premium - P149' : 'Basic - P99',
      autoSlideshow: isPremium,
      count: images.length,
      templates: TEMPLATES.map(t => ({ id: t.id, name: t.name, desc: t.desc })),
      images: images.map(i => i.image)
    });
  } catch (err) { console.error(err); return res.status(500).json({ error: err.message }); }
}