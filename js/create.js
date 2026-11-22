import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);   // public values only

async function shrink(file, max = 1600) {                    // keeps uploads small + fast
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = new OffscreenCanvas(bmp.width * s, bmp.height * s);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return c.convertToBlob({ type: "image/jpeg", quality: 0.9 });
}

async function submit() {
  const file = document.querySelector("#photo").files[0];
  const blob = await shrink(file);
  const { path, token } = await (await fetch("/api/upload-url", { method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ ext: "jpg", bytes: blob.size }) })).json();
  const up = await sb.storage.from("uploads").uploadToSignedUrl(path, token, blob);
  if (up.error) throw new Error(up.error.message);

  const order = await (await fetch("/api/orders", { method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ pkg: new URLSearchParams(location.search).get("pkg") || "basic",
      name: val("#name"), email: val("#email"), phone: val("#phone"), photoPath: path,
      consent: document.querySelector("#consent").checked }) })).json();

  localStorage.setItem("pasko_order", JSON.stringify(order));
  fetch("/api/render", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(order) }); // don't await
  location.href = `/result?o=${order.orderId}&t=${order.token}`;
}
const val = (s) => document.querySelector(s).value.trim();