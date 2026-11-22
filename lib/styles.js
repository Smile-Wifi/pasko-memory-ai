export const STYLES = [
  { id: "simbang-gabi", name: "Simbang Gabi",
    scene: "inside a warmly lit Filipino church at night after Misa de Gallo, wooden pews, glowing candles, hanging parol lanterns, red poinsettias" },
  { id: "snow", name: "Snow",
    scene: "cozy winter wonderland, snowy pine trees, soft falling snow, icy blue tones balanced by warm string-light bokeh, red knitted scarf" },
  { id: "pajama", name: "Pajama",
    scene: "Christmas morning at home, red plaid family pajamas, wrapped gifts and a lit Christmas tree, warm wooden floor, soft window light" },
  { id: "street", name: "Street Celebration",
    scene: "festive Philippine street at night, colorful parol and string lights as bokeh, joyful blurred crowd behind, warm golden streetlight" },
  { id: "barong", name: "Traditional / Barong",
    scene: "elegant studio holiday portrait in Filipino formal attire (barong Tagalog or Filipiniana, suited to the person), deep red and gold backdrop, a parol, soft studio key light" },
];

export const buildPrompt = (s) => `Create a photorealistic Christmas portrait of the SAME person shown in the reference photo.
IDENTITY LOCK: preserve the exact face — facial structure, eyes, nose, mouth, skin tone, apparent age, hairstyle, expression. Do not beautify, slim, lighten skin, or change ethnicity. Keep glasses and facial hair if present.
RESTORATION: if the source is old, faded, scratched or soft, repair damage and recover natural detail — never invent new features.
SCENE: ${s.scene}.
FRAMING: waist-up, subject centered, facing camera, natural warm smile, 85mm lens look, shallow depth of field, realistic skin texture.
EXCLUDE: no text, no watermark, no logos, no extra people, no distorted hands.`;