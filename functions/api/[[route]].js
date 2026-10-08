// Pages Function: lệnh chuyển điểm GG88. Chỉ approved khi admin bấm duyệt.

const KV_KEY = "transfers_gg88";
const SITES = ["GG88", "MM88", "LLWIN", "XX88"];
const MAX_ITEMS = 300;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
  });
}

function uid(bytes = 8) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function findKv(env) {
  if (env?.XOAMA_KV?.get && env.XOAMA_KV.put) return env.XOAMA_KV;
  return null;
}

function blankDb() {
  return {
    admin: { username: "admin", password: "admin123" },
    sessions: {},
    items: [],
  };
}

async function loadDb(kv) {
  try {
    const raw = await kv.get(KV_KEY);
    if (!raw) return blankDb();
    const parsed = JSON.parse(raw);
    return {
      admin: parsed.admin || blankDb().admin,
      sessions: parsed.sessions || {},
      items: Array.isArray(parsed.items) ? parsed.items : [],
    };
  } catch {
    return blankDb();
  }
}

async function saveDb(kv, db) {
  const now = Date.now();
  db.sessions = Object.fromEntries(
    Object.entries(db.sessions || {}).filter(([, s]) => s && s.exp > now)
  );
  db.items = (db.items || []).slice(0, MAX_ITEMS);
  await kv.put(KV_KEY, JSON.stringify(db));
}

function bearer(request) {
  return (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
}

function isAdmin(db, request) {
  const token = bearer(request);
  const session = token && db.sessions?.[token];
  return !!(session && session.exp > Date.now());
}

function publicItem(item) {
  return {
    id: item.id,
    status: item.status,
    amount: item.amount,
    fromUser: item.fromUser,
    fromSite: item.fromSite,
    toUser: item.toUser,
    toSite: item.toSite,
    createdAt: item.createdAt,
    decidedAt: item.decidedAt || null,
    message:
      item.status === "approved"
        ? "Chuyển điểm thành công."
        : item.status === "rejected"
          ? "Admin không duyệt. Chuyển điểm thất bại."
          : "Đang chờ admin duyệt.",
  };
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (request.method === "OPTIONS") return json({ ok: true });

  const kv = findKv(env);
  if (!kv) return json({ ok: false, message: "KV chưa được gắn." }, 500);

  const db = await loadDb(kv);

  if (path === "/api/login" && request.method === "POST") {
    let body = {};
    try { body = await request.json(); } catch { body = {}; }
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (username !== db.admin.username || password !== db.admin.password) {
      return json({ ok: false, message: "Sai tài khoản hoặc mật khẩu admin." }, 401);
    }
    const token = uid(24);
    db.sessions[token] = { exp: Date.now() + 12 * 60 * 60 * 1000 };
    await saveDb(kv, db);
    return json({ ok: true, token, username });
  }

  if (path === "/api/transfers" && request.method === "POST") {
    let body = {};
    try { body = await request.json(); } catch { body = {}; }
    const fromUser = String(body.fromUser || "").trim().slice(0, 40);
    const toUser = String(body.toUser || "").trim().slice(0, 40);
    const fromSite = String(body.fromSite || "").trim();
    const toSite = "GG88";
    const amount = Math.floor(Number(body.amount));
    if (!fromUser || !toUser) return json({ ok: false, message: "Nhập đủ tên tài khoản nguồn và tài khoản đến." }, 400);
    if (!SITES.includes(fromSite)) return json({ ok: false, message: "Chọn trang nguồn." }, 400);
    if (!Number.isFinite(amount) || amount <= 0) return json({ ok: false, message: "Số điểm chuyển phải lớn hơn 0." }, 400);

    const item = {
      id: uid(8),
      fromUser,
      fromSite,
      toUser,
      toSite,
      amount,
      status: "pending",
      createdAt: new Date().toISOString(),
      decidedAt: null,
    };
    db.items.unshift(item);
    await saveDb(kv, db);
    return json({ ok: true, ...publicItem(item) });
  }

  const one = path.match(/^\/api\/transfers\/([a-f0-9]+)$/);
  if (one && request.method === "GET") {
    const item = db.items.find((x) => x.id === one[1]);
    if (!item) return json({ ok: false, message: "Không tìm thấy lệnh chuyển." }, 404);
    return json({ ok: true, ...publicItem(item) });
  }

  const decide = path.match(/^\/api\/transfers\/([a-f0-9]+)\/(approve|reject)$/);
  if (decide && request.method === "POST") {
    if (!isAdmin(db, request)) return json({ ok: false, message: "Cần đăng nhập admin." }, 401);
    const item = db.items.find((x) => x.id === decide[1]);
    if (!item) return json({ ok: false, message: "Không tìm thấy lệnh chuyển." }, 404);
    if (item.status !== "pending") return json({ ok: false, message: "Lệnh này đã được xử lý." }, 400);
    item.status = decide[2] === "approve" ? "approved" : "rejected";
    item.decidedAt = new Date().toISOString();
    await saveDb(kv, db);
    return json({ ok: true, ...publicItem(item) });
  }

  if (path === "/api/transfers" && request.method === "GET") {
    if (!isAdmin(db, request)) return json({ ok: false, message: "Cần đăng nhập admin." }, 401);
    return json({ ok: true, items: db.items.map(publicItem) });
  }

  return json({ ok: false, message: "Không tìm thấy API." }, 404);
}
