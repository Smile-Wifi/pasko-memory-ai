import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { sb } from "./supabaseAdmin.js";
import { STYLES } from "./styles.js";
import { buildSlideshow } from "./slideshow.js";

export async function buildVideo(orderId) {
  const db = sb();
  const { data: o } = await db.from("orders").select("*").eq("id", orderId).single();
  if (!o) return { orderId, skipped: "not-found" };
  if (o.pkg !== "premium") return { orderId, skipped: "basic-package" };
  if (o.status !== "paid") return { orderId, skipped: "unpaid" };
  if (o.video_path) return { orderId, skipped: "already-built" };

  const { data: claimed, error: claimErr } = await db.rpc("claim_video_job", { p_id: orderId });
  if (claimErr) return { orderId, skipped: "claim-error", error: claimErr.message };
  if (!claimed) return { orderId, skipped: "locked-or-photos-not-ready" };

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pasko-"));
  try {
    const { data: ph } = await db.from("photos").select("style_id,storage_path").eq("order_id", o.id);
    const ordered = STYLES.map(s => (ph ?? []).find(p => p.style_id === s.id)).filter(Boolean);
    if (ordered.length < STYLES.length) throw new Error("photos not complete");

    const grab = async (bucket, key, dest) => {
      const { data, error } = await db.storage.from(bucket).download(key);
      if (error || !data) throw new Error(`download ${key}: ${error?.message || "empty"}`);
      await fs.writeFile(dest, Buffer.from(await data.arrayBuffer()));
      return dest;
    };

    const imagePaths = [];
    for (const [i, p] of ordered.entries())
      imagePaths.push(await grab("renders", p.storage_path, path.join(dir, `${i}.webp`)));

    const musicPath = await grab("assets", process.env.MUSIC_KEY || "music/pasko.mp3",
                                 path.join(dir, "music.mp3"));

    const outPath = path.join(dir, "slideshow.mp4");
    const info = await buildSlideshow({ imagePaths, musicPath, outPath });

    const key = `${o.id}/slideshow.mp4`;
    const up = await db.storage.from("renders")
      .upload(key, await fs.readFile(outPath), { contentType: "video/mp4", upsert: true });
    if (up.error) throw new Error(`upload video: ${up.error.message}`);

    await db.from("orders").update({
      video_path: key, video_status: "ready", video_seconds: info.seconds,
      video_lock_at: null, last_error: null,
    }).eq("id", o.id);

    return { orderId, status: "ready", ...info };
  } catch (e) {
    const msg = String(e?.message || e);
    await db.from("orders")
      .update({ video_status: "failed", video_lock_at: null, last_error: msg.slice(0, 900) })
      .eq("id", o.id);
    return { orderId, status: "failed", error: msg };
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}