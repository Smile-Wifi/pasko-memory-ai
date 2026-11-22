// lib/renderOrder.js  (body of your old api/render.js, minus HTTP)
export async function renderOrder(orderId) {
  // …claim lock, load missing styles, 5 × Muse in parallel, upload each…
  const failed = results.filter(r => r.status === "rejected");
  if (failed.length) throw new Error(`${failed.length} styles failed`);   // ← throw = redelivery
  if (o.pkg === "premium" && !o.video_path)
    await send("pasko-video", { orderId }, { idempotencyKey: `video-${orderId}` });
}