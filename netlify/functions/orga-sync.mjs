// Synchronisation du logiciel du jour J (espace organisateurs Michaëlo)
// Stockage : Netlify Blobs. Accès : jeton dérivé de l'identifiant et du mot de passe communs.
// Seule l'empreinte SHA-256 du jeton figure ici ; le jeton lui-même n'est connu que des navigateurs connectés.
import { getStore } from "@netlify/blobs";
import { createHash, timingSafeEqual } from "node:crypto";

const TOKEN_SHA256 = "2dc9382db6279e5764c520cf27f25f94804c66bf0aafd4267addfbaa83694ba8";
const KEY = "etat";
const MAX_BODY = 512 * 1024;

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

function authorized(req) {
  const h = req.headers.get("authorization") || "";
  const tok = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (!/^[0-9a-f]{64}$/.test(tok)) return false;
  const a = Buffer.from(createHash("sha256").update(tok).digest("hex"));
  const b = Buffer.from(TOKEN_SHA256);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function readState(store) {
  const r = await store.getWithMetadata(KEY, { type: "json" });
  if (!r || !r.data) return { state: { ver: 0, items: {} }, etag: null };
  return { state: r.data, etag: r.etag || null };
}

export default async (req) => {
  if (!authorized(req)) return json({ error: "non autorisé" }, 401);
  const store = getStore({ name: "michaelo-orga", consistency: "strong" });

  if (req.method === "GET") {
    const since = Number(new URL(req.url).searchParams.get("since") || 0) || 0;
    const { state } = await readState(store);
    const changes = [];
    for (const v of Object.values(state.items)) if (v.v > since) changes.push({ coll: v.coll, id: v.id, data: v.data });
    return json({ ver: state.ver, changes });
  }

  if (req.method === "POST") {
    const text = await req.text();
    if (text.length > MAX_BODY) return json({ error: "trop volumineux" }, 413);
    let body;
    try { body = JSON.parse(text); } catch { return json({ error: "JSON invalide" }, 400); }
    const list = (Array.isArray(body) ? body : [body]).filter(
      (x) => x && typeof x.coll === "string" && typeof x.id === "string" && x.id.length < 200 && x.data && typeof x.data === "object"
    );
    if (!list.length) return json({ error: "rien à enregistrer" }, 400);
    for (let attempt = 0; attempt < 8; attempt++) {
      const { state, etag } = await readState(store);
      for (const x of list) {
        state.ver += 1;
        state.items[x.coll + "/" + x.id] = { coll: x.coll, id: x.id, data: x.data, v: state.ver };
      }
      const opts = etag ? { onlyIfMatch: etag } : { onlyIfNew: true };
      const res = await store.setJSON(KEY, state, opts);
      if (!res || res.modified !== false) return json({ ok: true, ver: state.ver });
      await new Promise((r) => setTimeout(r, 40 + Math.random() * 120));
    }
    return json({ error: "conflit, réessayez" }, 409);
  }

  return json({ error: "méthode non prise en charge" }, 405);
};
