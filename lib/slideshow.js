// lib/slideshow.js - Christmas slideshow, 720x1280, 30s, 5 photos x 6s
export const SLIDESHOW_WIDTH = 720;
export const SLIDESHOW_HEIGHT = 1280;
export const SLIDESHOW_DURATION_SECONDS = 30;
export const SLIDESHOW_PHOTO_SECONDS = 6;
const W = SLIDESHOW_WIDTH;
const H = SLIDESHOW_HEIGHT;

export function pickVideoType() {
  if (typeof MediaRecorder === "undefined") return null;
  const VIDEO_TYPES = ["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/webm;codecs=vp8,opus", "video/webm;codecs=vp9,opus"];
  for (const mime of VIDEO_TYPES) {
    if (MediaRecorder.isTypeSupported(mime)) return { mime, ext: mime.startsWith("video/mp4") ? "mp4" : "webm" };
  }
  return null;
}

export function makeGrain() {
  const g = document.createElement("canvas");
  g.width = 256; g.height = 256;
  const gctx = g.getContext("2d");
  if (gctx) {
    const data = gctx.createImageData(256, 256);
    for (let i = 0; i < data.data.length; i += 4) {
      const v = Math.random() * 255;
      data.data[i] = data.data[i+1] = data.data[i+2] = v;
      data.data[i+3] = 10;
    }
    gctx.putImageData(data, 0, 0);
  }
  return g;
}

export async function loadFilmPhoto(photo) {
  const original = await createImageBitmap(photo);
  try {
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, H / Math.max(original.width, original.height));
    canvas.width = Math.round(original.width * scale);
    canvas.height = Math.round(original.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Photo rendering is unavailable.");
    ctx.filter = "sepia(0.12) saturate(1.08) contrast(1.02) brightness(1.02)";
    ctx.drawImage(original, 0, 0, canvas.width, canvas.height);
    return await createImageBitmap(canvas);
  } finally { original.close(); }
}

export function merryChristmasReveal(t) {
  if (t < 1 || t > 5) return { opacity: 0, scale: 0.9, blur: 8 };
  const inP = Math.min(1, (t - 1) / 0.9);
  const outP = t > 4 ? (t - 4) : 0;
  const ease = 1 - Math.pow(1 - inP, 3);
  return { opacity: ease * (1 - outP), scale: 0.88 + 0.12 * ease + 0.06 * outP, blur: (1 - ease) * 8 + outP * 10 };
}

function drawCover(ctx, img, alpha, zoom, x=0, y=0, w=W, h=H) {
  const scale = Math.max(w / img.width, h / img.height) * zoom;
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

export function drawFilmFrame(ctx, bitmaps, t, grain) {
  if (!bitmaps.length) return;
  const photos = bitmaps.slice(0, 5);
  const n = photos.length;
  ctx.save();
  ctx.filter = "none";
  ctx.fillStyle = "#0b0b0b";
  ctx.fillRect(0, 0, W, H);
  const topH = Math.round(H * 0.7);
  const per = SLIDESHOW_PHOTO_SECONDS;
  const local = Math.max(0, t) % SLIDESHOW_DURATION_SECONDS;
  const idx = Math.floor(local / per) % n;
  const within = local - Math.floor(local / per) * per;
  const fade = local < per ? 1 : Math.min(1, within / 1);
  const prev = (idx - 1 + n) % n;
  if (fade < 1) drawCover(ctx, photos[prev], 1, 1.12, 0, 0, W, topH);
  drawCover(ctx, photos[idx], fade, 1.02 + 0.1 * (within / per), 0, 0, W, topH);
  const shade = ctx.createLinearGradient(0, topH * 0.55, 0, topH);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(1, "#0b0b0b");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, topH);
  // Filmstrip
  const cardH = 300, cardW = Math.round(cardH * 9 / 16) + 30, gap = 22;
  const pitch = cardW + gap;
  const cardY = topH + (H - topH - cardH) / 2 + 10;
  const offset = -(local / SLIDESHOW_DURATION_SECONDS) * n * pitch * 2;
  const shift = ((offset % (n * pitch)) + n * pitch) % (n * pitch);
  for (let k = -n; k < n * 2; k++) {
    const x = k * pitch + shift - n * pitch + 20;
    if (x + cardW < 0 || x > W) continue;
    const photo = photos[((k % n) + n) % n];
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, cardY, cardW, cardH, 18);
    ctx.clip();
    drawCover(ctx, photo, 1, 1, x, cardY, cardW, cardH);
    ctx.restore();
    ctx.strokeStyle = "#4a463f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, cardY, cardW, cardH, 18);
    ctx.stroke();
  }
  // Merry Christmas
  const r = merryChristmasReveal(local);
  if (r.opacity > 0) {
    ctx.save();
    ctx.globalAlpha = r.opacity;
    ctx.translate(W / 2, 170);
    ctx.scale(r.scale, r.scale);
    ctx.filter = r.blur > 0.3 ? `blur(${r.blur.toFixed(1)}px)` : "none";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#e0a92e";
    ctx.shadowBlur = 30;
    ctx.fillStyle = "#fdfbf5";
    ctx.font = "700 40px sans-serif";
    ctx.fillText("M E R R Y", 0, -50);
    ctx.font = "104px cursive";
    ctx.fillStyle = "#f6d77a";
    ctx.fillText("Christmas", 0, 40);
    ctx.restore();
  }
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = ctx.createPattern(grain, "repeat") || "rgba(0,0,0,0)";
  ctx.fillRect(0, 0, W + 128, H + 128);
  ctx.restore();
}