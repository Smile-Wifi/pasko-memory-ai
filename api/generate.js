// api/generate.js - TEXT TO IMAGE via api.meta.ai/v1/images/generations
// Server-only: MODEL_API_KEY never reaches browser
export const config = { maxDuration: 60 };

const META_IMAGE_URL = "https://api.meta.ai/v1/images/generations";

async function generateMetaImage(prompt, size = "1024x1024") {
  const apiKey = process.env["MODEL_API_KEY"];
  if (!apiKey) throw new Error("The Meta model key is not set up yet.");
  const response = await fetch(META_IMAGE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "muse-image-1.0", prompt, size, n: 1, output_format: "png" }),
  });
  const text = await response.text();
  if (!response.ok) {
    console.error(`【entity-Meta¦canonical_name=Meta】 image failed [${response.status}]: ${text.slice(0, 500)}`);
    let message = "";
    try { message = JSON.parse(text).error?.message || ""; } catch {}
    throw new Error(message ? `【entity-Meta¦canonical_name=Meta】 image failed: ${message}` : `【entity-Meta¦canonical_name=Meta】 image request failed (${response.status}).`);
  }
  const data = JSON.parse(text);
  const image = data.data?.[0]?.b64_json;
  if (!image) throw new Error("【entity-Meta¦canonical_name=Meta】 returned no image.");
  return image;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { styleId, styleName, packageId, reference, isTest } = req.body || {};
    const isPremium = packageId === 'premium';

    // READY-MADE TEXT TO IMAGE PROMPTS - Basic 99 = 1 prompt, Premium 149 = 5 prompts
    const READY_PROMPTS = {
      classic: {
        basic: `Beautiful Christmas portrait, smiling Filipino woman, warm Christmas lights, red and gold decor, Christmas tree bokeh in background, cozy holiday studio, photorealistic, high detail, festive, sharp, 4k`,
        premium: [
          `Beautiful Christmas portrait, smiling Filipino woman, warm Christmas lights, red and gold decor, Christmas tree bokeh, cozy holiday studio, photorealistic, 4k`,
          `Elegant Christmas portrait, woman in red sweater, holding gift, Christmas tree with warm lights, snow outside window, photorealistic, festive`,
          `Family Christmas photo style, woman smiling, Christmas wreath, warm fireplace, stockings, cozy living room, photorealistic`,
          `Christmas portrait with Santa hat, woman laughing, colorful Christmas lights, candy canes, festive background, photorealistic`,
          `Luxury Christmas portrait, woman in white dress, gold ornaments, Christmas tree, elegant studio, warm golden light, photorealistic`
        ]
      },
      snow: {
        basic: `Winter Wonderland Christmas portrait, smiling Filipino woman, snow falling, icy blue tones, snowflakes, bright winter studio, photorealistic, 4k`,
        premium: [
          `Winter Wonderland portrait, woman in white sweater, snow falling, icy blue background, photorealistic`,
          `Snowy Christmas portrait, woman with scarf, snowflakes, pine trees with snow, winter light, photorealistic`,
          `Christmas portrait in snow village, woman smiling, warm lights in snow, cozy winter, photorealistic`,
          `Ice blue Christmas portrait, woman, frozen winter background, sparkling snow, photorealistic`,
          `Winter Christmas studio portrait, woman, snow bokeh, blue and white tones, photorealistic`
        ]
      },
      luxury: {
        basic: `Luxury Gold Christmas portrait, elegant Filipino woman, gold studio, gold ornaments, premium holiday portrait, warm golden light, photorealistic, 4k`,
        premium: [
          `Luxury Gold Christmas portrait, elegant woman, gold ornaments, gold studio, photorealistic`,
          `Elegant gold Christmas portrait, woman in gold dress, chandelier, luxury background, photorealistic`,
          `Premium Christmas portrait, woman, gold and white decor, champagne tones, photorealistic`,
          `Luxury Christmas portrait, woman holding champagne glass, gold Christmas tree, photorealistic`,
          `Golden Christmas studio portrait, woman, sparkling gold lights, elegant, photorealistic`
        ]
      },
      cozy: {
        basic: `Cozy Christmas portrait, smiling Filipino woman, warm cabin, fireplace, warm lights, cozy sweater, warm atmosphere, photorealistic, 4k`,
        premium: [
          `Cozy Christmas portrait, woman in cozy sweater, fireplace, warm lights, photorealistic`,
          `Cabin Christmas portrait, woman with hot cocoa, warm cabin, Christmas tree, photorealistic`,
          `Warm Christmas portrait, woman by fireplace, stockings, cozy blanket, photorealistic`,
          `Cozy Christmas living room portrait, woman, warm lights, Christmas decor, photorealistic`,
          `Warm cabin Christmas portrait, woman smiling, wooden cabin, warm tones, photorealistic`
        ]
      },
      candy: {
        basic: `Candy Christmas portrait, smiling Filipino woman, playful festive colors, candy canes, colorful Christmas decor, bright, photorealistic, 4k`,
        premium: [
          `Candy Christmas portrait, woman, candy canes, colorful decor, bright festive, photorealistic`,
          `Playful Christmas portrait, woman in red, candy shop background, colorful lights, photorealistic`,
          `Candy cane Christmas portrait, woman smiling, pink and red Christmas, photorealistic`,
          `Sweet Christmas portrait, woman, gingerbread, candy decor, festive, photorealistic`,
          `Colorful Candy Christmas portrait, woman, bright Christmas lights, candy, photorealistic`
        ]
      },
      soft: {
        basic: `Soft elegant Holiday Portrait, smiling Filipino woman, soft studio light, subtle Christmas background, elegant, photorealistic, 4k`,
        premium: [
          `Soft Holiday Portrait, woman, soft studio light, subtle Christmas background, photorealistic`,
          `Elegant Holiday Portrait, woman in white, soft bokeh Christmas lights, photorealistic`,
          `Soft Christmas portrait, woman smiling, warm soft light, minimal Christmas decor, photorealistic`,
          `Classic Holiday Portrait, woman, soft studio, Christmas tree bokeh, photorealistic`,
          `Elegant soft Christmas portrait, woman, pastel Christmas tones, photorealistic`
        ]
      }
    };

    const stylePrompts = READY_PROMPTS[styleId] || READY_PROMPTS.classic;
    const promptsToGenerate = isPremium ? stylePrompts.premium : [stylePrompts.basic];
    const finalPrompts = isTest ? [promptsToGenerate[0]] : promptsToGenerate;

    let images = [];
    for (const prompt of finalPrompts) {
      try {
        const b64 = await generateMetaImage(prompt, "1024x1024");
        images.push(`data:image/png;base64,${b64}`);
      } catch (e) {
        console.error('One prompt failed:', e.message);
        // continue to next prompt
      }
    }

    if (!images.length) {
      return res.status(500).json({ error: 'No image returned from Muse - check MODEL_API_KEY' });
    }

    return res.status(200).json({
      success: true,
      isTest: !!isTest,
      reference: reference || '',
      style: styleName,
      packageId,
      count: images.length,
      images
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}