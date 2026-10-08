export const KV_KEY = "transfers_gg88";
export const SITES = ["GG88", "MM88", "LLWIN", "XX88"];
export const STATUSES = ["success", "ineligible"];
export const INELIGIBLE_MSG = "Tài khoản chưa đủ điều kiện !!";
const MAX_TRANSFERS = 300;

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=UTF-8", "Cache-Control": "no-store" },
  });
}

export function uid(bytes = 8) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const norm = (s) => String(s || "").trim().toLowerCase();

export async function readBody(request) {
  try { return await request.json(); } catch { return {}; }
}

export async function loadDb(kv) {
  let p = {};
  try { p = JSON.parse((await kv.get(KV_KEY)) || "{}"); } catch { p = {}; }
  return {
    admin: p.admin || { username: "admin", password: "admin123" },
    sessions: p.sessions || {},
    accounts: Array.isArray(p.accounts) ? p.accounts : [],
    transfers: Array.isArray(p.transfers) ? p.transfers : [],
  };
}

export async function saveDb(kv, db) {
  const now = Date.now();
  db.sessions = Object.fromEntries(Object.entries(db.sessions).filter(([, s]) => s && s.exp > now));
  db.transfers = db.transfers.slice(0, MAX_TRANSFERS);
  await kv.put(KV_KEY, JSON.stringify(db));
}

export function isAdmin(db, request) {
  const t = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const s = t && db.sessions[t];
  return !!(s && s.exp > Date.now());
}
