// api/video.js - SERVER-SIDE 30s slideshow + music
// Supports BOTH:
// 1. New create.html: { images: [base64 x5] } -> returns MP4 directly
// 2. Old orders: { orderId, token } -> returns JSON (uses lib/buildVideo)
export const config = { maxDuration: 60, api: { bodyParser: { sizeLimit: '25mb' } } };

import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import os from 'os';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegStatic);

async function buildMp4FromImages(images) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pasko-'));
  const imgPaths = [];
  for (let i = 0; i < Math.min(images.length, 5); i++) {
    const p = path.join(tmp, `img${i}.png`);
    const b64 = images[i].replace(/^data:image\/\w+;base64,[STRIPPED], '');
    fs.writeFileSync(p, Buffer.from(b64, 'base64'));
    imgPaths.push(p);
  }
  const musicPath = path.join(process.cwd(), 'public', 'music', 'christmas.mp3');
  const hasMusic = fs.existsSync(musicPath);
  const outPath = path.join(tmp, 'slideshow.mp4');
  let cmd = ffmpeg();
  imgPaths.forEach(p => { cmd = cmd.input(p).inputOptions(['-loop 1', '-t 6']); });
  if (hasMusic) cmd = cmd.input(musicPath).inputOptions(['-t 30']);
  const filters = imgPaths.map((_, i) => `[${i}:v]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,zoompan=z='min(zoom+0.0015,1.15)':d=180:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=720x1280:fps=30[v${i}]`).join(';') + ';' + imgPaths.map((_, i) => `[v${i}]`).join('') + `concat=n=${imgPaths.length}:v=1,a=0,format=yuv420p[vout]`;
  await new Promise((resolve, reject) => {
    cmd.complexFilter(filters).outputOptions(['-map [vout]', ...(hasMusic ? ['-map 5:a', '-shortest', '-c:a aac', '-b:a 128k'] : []), '-c:v libx264', '-pix_fmt yuv420p', '-r 30', '-movflags +faststart']).output(outPath).on('end', resolve).on('error', reject).run();
  });
  const buf = fs.readFileSync(outPath);
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
  return buf;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const body = req.body || {};
    // NEW FLOW: images from create.html
    if (body.images && Array.isArray(body.images) && body.images.length >= 2) {
      const buf = await buildMp4FromImages(body.images);
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', 'attachment; filename="christmas-slideshow-30s.mp4"');
      res.setHeader('Content-Length', buf.length);
      return res.status(200).send(buf);
    }
    // OLD FLOW: orderId + token
    if (body.orderId && body.token) {
      const { sb } = await import('../lib/supabaseAdmin.js');
      const { buildVideo } = await import('../lib/buildVideo.js');
      const db = sb();
      const { data: o } = await db.from('orders').select('id,video_attempts').eq('id', body.orderId).eq('token', body.token).single();
      if (!o) return res.status(404).json({ error: 'order not found' });
      if (o.video_attempts >= 3 && o.video_attempts < 5) await db.from('orders').update({ video_attempts: 2 }).eq('id', o.id);
      const result = await buildVideo(o.id);
      return res.status(result.skipped ? 202 : 200).json(result);
    }
    return res.status(400).json({ error: 'Send { images: [...] } or { orderId, token }' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Video failed: ' + err.message });
  }
}