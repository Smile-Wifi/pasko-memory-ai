// api/generate.js - Muse Image API via api.meta.ai/v1/responses
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { photo, styleId, styleName, packageId, name, reference, isTest } = req.body || {};

    if (!photo) return res.status(400).json({ error: 'No photo provided' });

    const apiKey = process.env.MODEL_API_KEY || process.env.MUSE_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'MODEL_API_KEY missing in Vercel' });

    const STYLE_PROMPTS = {
      classic: 'Classic Christmas, warm lights, red decor, Christmas tree bokeh, cozy holiday studio',
      snow: 'Winter Wonderland, snow falling, icy blue tones, snowflakes, bright winter studio',
      luxury: 'Luxury Gold Christmas, elegant gold studio, gold ornaments, premium holiday portrait',
      cozy: 'Cozy Christmas cabin, warm fireplace, warm cabin atmosphere, soft warm light',
      candy: 'Candy Christmas, playful festive colors, candy canes, colorful Christmas decor',
      soft: 'Holiday Portrait, soft elegant portrait, soft studio light, subtle Christmas background'
    };

    const stylePrompt = STYLE_PROMPTS[styleId] || STYLE_PROMPTS.classic;

    const promptText = `Transform this portrait into a Christmas photo. Keep the same person, same face, same identity, same hairstyle. Do not change the face. Style: ${stylePrompt}. High quality, photorealistic, festive, sharp details, higher resolution.`;

    const museRes = await fetch('https://api.meta.ai/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'muse-image-1.0',
        input: [
          {
            role: 'user',
            type: 'message',
            content: [
              { type: 'input_text', text: promptText },
              { type: 'input_image', image_url: photo }
            ]
          }
        ],
        max_output_tokens: 2048,
        store: true,
        stream: false,
        temperature: 0.6,
        top_p: 0.9,
        tools: [
          {
            type: 'image_generation',
            enable_image_search: true,
            enable_shell: true,
            enable_web_search: true,
            output_format: 'png',
            reasoning_strength: 'high'
          }
        ]
      })
    });

    const data = await museRes.json();

    if (!museRes.ok) {
      console.error('Muse API error:', JSON.stringify(data).slice(0, 2000));
      return res.status(500).json({ error: data.error?.message || data.message || 'Muse API failed', details: data });
    }

    let images = [];
    const outputs = data.output || data.data || [];
    for (const item of outputs) {
      if (item.type === 'image_generation_call' && item.result) {
        images.push(`data:image/png;base64,${item.result}`);
      }
      if (item.content) {
        for (const c of item.content) {
          if (c.type === 'output_image' && c.image_base64) images.push(`data:image/png;base64,${c.image_base64}`);
          if (c.type === 'image' && c.image_url) images.push(c.image_url);
        }
      }
      if (item.image_base64) images.push(`data:image/png;base64,${item.image_base64}`);
      if (item.image_url) images.push(item.image_url);
    }

    if (!images.length && data.image_generation_call?.result) {
      images.push(`data:image/png;base64,${data.image_generation_call.result}`);
    }

    if (!images.length) {
      console.error('No image in Muse response:', JSON.stringify(data).slice(0, 3000));
      return res.status(500).json({ error: 'No image returned from Muse', raw: data });
    }

    return res.status(200).json({
      success: true,
      isTest: !!isTest,
      reference: reference || '',
      style: styleName,
      images
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}