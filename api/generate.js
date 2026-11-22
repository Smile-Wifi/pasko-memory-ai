// api/generate.js - FIXED - shows real 【entity-Muse¦canonical_name=Muse】 error, does not swallow it
export const config = { maxDuration: 60 };
const META_IMAGE_URL = "https://api.meta.ai/v1/images/generations";

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
  console.log("Muse raw:", text.slice(0, 1500));
  if (!response.ok) {
    throw new Error(`Muse failed ${response.status}: ${text.slice(0, 800)}`);
  }
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
    const { styleId, styleName, packageId, reference, isTest } = req.body || {};
    const isPremium = packageId === 'premium';
    const READY_PROMPTS = {
      classic: { basic: `Beautiful Christmas portrait, smiling Filipino woman, warm Christmas lights, red and gold decor, Christmas tree bokeh, cozy holiday studio, photorealistic, 4k`, premium: [`Beautiful Christmas portrait, smiling Filipino woman, warm Christmas lights, red and gold decor, Christmas tree bokeh, cozy holiday studio, photorealistic, 4k`, `Elegant Christmas portrait, woman in red sweater, holding gift, Christmas tree with warm lights, photorealistic`, `Family Christmas photo style, woman smiling, Christmas wreath, warm fireplace, photorealistic`, `Christmas portrait with Santa hat, woman laughing, colorful Christmas lights, photorealistic`, `Luxury Christmas portrait, woman in white dress, gold ornaments, Christmas tree, photorealistic`] },
      snow: { basic: `Winter Wonderland Christmas portrait, smiling Filipino woman, snow falling, icy blue tones, photorealistic, 4k`, premium: [`Winter Wonderland portrait, woman in white sweater, snow falling, icy blue background, photorealistic`, `Snowy Christmas portrait, woman with scarf, snowflakes, photorealistic`, `Christmas portrait in snow village, woman smiling, warm lights in snow, photorealistic`, `Ice blue Christmas portrait, woman, frozen winter background, photorealistic`, `Winter Christmas studio portrait, woman, snow bokeh, photorealistic`] },
      luxury: { basic: `Luxury Gold Christmas portrait, elegant Filipino woman, gold studio, gold ornaments, photorealistic, 4k`, premium: [`Luxury Gold Christmas portrait, elegant woman, gold ornaments, photorealistic`, `Elegant gold Christmas portrait, woman in gold dress, chandelier, photorealistic`, `Premium Christmas portrait, woman, gold and white decor, photorealistic`, `Luxury Christmas portrait, woman holding champagne glass, gold Christmas tree, photorealistic`, `Golden Christmas studio portrait, woman, sparkling gold lights, photorealistic`] },
      cozy: { basic: `Cozy Christmas portrait, smiling Filipino woman, warm cabin, fireplace, warm lights, photorealistic, 4k`, premium: [`Cozy Christmas portrait, woman in cozy sweater, fireplace, photorealistic`, `Cabin Christmas portrait, woman with hot cocoa, warm cabin, photorealistic`, `Warm Christmas portrait, woman by fireplace, stockings, photorealistic`, `Cozy Christmas living room portrait, woman, warm lights, photorealistic`, `Warm cabin Christmas portrait, woman smiling, wooden cabin, photorealistic`] },
      candy: { basic: `Candy Christmas portrait, smiling Filipino woman, playful festive colors, candy canes, colorful Christmas decor, photorealistic, 4k`, premium: [`Candy Christmas portrait, woman, candy canes, colorful decor, photorealistic`, `Playful Christmas portrait, woman in red, candy shop background, photorealistic`, `Candy cane Christmas portrait, woman smiling, pink and red Christmas, photorealistic`, `Sweet Christmas portrait, woman, gingerbread, candy decor, photorealistic`, `Colorful Candy Christmas portrait, woman, bright Christmas lights, photorealistic`] },
      soft: { basic: `Soft elegant Holiday Portrait, smiling Filipino woman, soft studio light, subtle Christmas background, photorealistic, 4k`, premium: [`Soft Holiday Portrait, woman, soft studio light, subtle Christmas background, photorealistic`, `Elegant Holiday Portrait, woman in white, soft bokeh Christmas lights, photorealistic`, `Soft Christmas portrait, woman smiling, warm soft light, photorealistic`, `Classic Holiday Portrait, woman, soft studio, Christmas tree bokeh, photorealistic`, `Elegant soft Christmas portrait, woman, pastel Christmas tones, photorealistic`] }
    };
    const stylePrompts = READY_PROMPTS[styleId] || READY_PROMPTS.classic;
    const prompts = isPremium ? stylePrompts.premium : [stylePrompts.basic];
    const finalPrompts = isTest ? [prompts[0]] : prompts;
    let images = [];
    for (const p of finalPrompts) {
      const img = await generateMetaImage(p, "1024x1024");
      images.push(img);
    }
    return res.status(200).json({ success: true, isTest: !!isTest, reference: reference || '', style: styleName, packageId, count: images.length, images });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}