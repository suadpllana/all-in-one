import { getStore } from "@netlify/blobs";

// Sync codes are user-generated secrets (e.g. "k3vp-8m2q-x7nd"). The code IS
// the auth: anyone who has it can read/write that one document, nothing else.
const KEY_RE = /^[a-z0-9][a-z0-9-]{7,63}$/;

// Keep documents to a sane size so a buggy/malicious client can't fill the store.
const MAX_BODY_BYTES = 512 * 1024;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default async (req) => {
  const url = new URL(req.url);
  const key = (url.searchParams.get("key") ?? "").toLowerCase();
  if (!KEY_RE.test(key)) return json({ error: "invalid sync code" }, 400);

  // Strong consistency: a device must see the other device's latest write,
  // otherwise revision checks are meaningless.
  const store = getStore({ name: "solo-sync", consistency: "strong" });

  if (req.method === "GET") {
    const doc = await store.get(key, { type: "json" });
    // rev 0 / null data = "nothing stored yet for this code"
    return json(doc ?? { rev: 0, data: null });
  }

  if (req.method === "PUT") {
    const raw = await req.text();
    if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
      return json({ error: "too large" }, 413);
    }

    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return json({ error: "invalid JSON" }, 400);
    }
    if (
      typeof body?.rev !== "number" ||
      typeof body?.data !== "object" ||
      body.data === null
    ) {
      return json({ error: "expected { rev, data }" }, 400);
    }

    // Optimistic concurrency: the client must send the rev it last saw. If
    // another device wrote in the meantime, return the current doc as a 409
    // so the client can merge and retry.
    const current = (await store.get(key, { type: "json" })) ?? { rev: 0, data: null };
    if (current.rev !== body.rev) return json(current, 409);

    const next = {
      rev: current.rev + 1,
      data: body.data,
      updatedAt: new Date().toISOString(),
    };
    await store.setJSON(key, next);
    return json({ rev: next.rev });
  }

  return json({ error: "method not allowed" }, 405);
};
