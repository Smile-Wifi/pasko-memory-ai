// api/queues/photos.js
import { handleCallback } from "@vercel/queue";
import { renderOrder } from "../../lib/renderOrder.js";
export const POST = handleCallback(async (job) => { await renderOrder(job.orderId); });