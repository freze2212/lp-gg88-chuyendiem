import { SITES, STATUSES, INELIGIBLE_MSG, json, uid, norm, readBody, loadDb, saveDb, isAdmin } from "../_lib/store.js";
import { sitekey, verifyTurnstile } from "../_lib/turnstile.js";

export async function onRequest({ request, env }) {
  const path = new URL(request.url).pathname.replace(/\/+$/, "");
  const method = request.method;
  const kv = env.XOAMA_KV;
  if (!kv) return json({ ok: false, message: "KV chưa được gắn." }, 500);

  if (path === "/api/config") return json({ ok: true, turnstileSitekey: sitekey(env), sites: SITES });

  const db = await loadDb(kv);

  if (path === "/api/login" && method === "POST") {
    const b = await readBody(request);
    if (String(b.username || "").trim() !== db.admin.username || String(b.password || "") !== db.admin.password) {
      return json({ ok: false, message: "Sai tài khoản hoặc mật khẩu admin." }, 401);
    }
    const token = uid(24);
    db.sessions[token] = { exp: Date.now() + 12 * 3600 * 1000 };
    await saveDb(kv, db);
    return json({ ok: true, token });
  }

  if (path === "/api/transfers" && method === "POST") {
    const b = await readBody(request);
    const fromUser = String(b.fromUser || "").trim().slice(0, 40);
    const toUser = String(b.toUser || "").trim().slice(0, 40);
    const fromSite = String(b.fromSite || "");
    const toSite = String(b.toSite || "");
    const amount = Math.floor(Number(b.amount));
    if (!fromUser || !toUser) return json({ ok: false, message: "Nhập đủ tài khoản nguồn và tài khoản đến." }, 400);
    if (!SITES.includes(fromSite) || !SITES.includes(toSite)) return json({ ok: false, message: "Chọn trang cho cả hai tài khoản." }, 400);
    if (!(amount > 0)) return json({ ok: false, message: "Số điểm chuyển phải lớn hơn 0." }, 400);
    const human = await verifyTurnstile(env, b.turnstileToken, request.headers.get("CF-Connecting-IP"));
    if (!human) return json({ ok: false, message: "Xác thực bảo mật thất bại, thử lại." }, 403);

    const acc = db.accounts.find((a) => norm(a.username) === norm(toUser));
    const result = acc && acc.status === "success" ? "success" : "ineligible";
    db.transfers.unshift({ id: uid(8), fromUser, fromSite, toUser, toSite, amount, result, createdAt: new Date().toISOString() });
    await saveDb(kv, db);
    return json({
      ok: true,
      result,
      message: result === "success" ? "Chúc mừng, chuyển điểm thành công!" : INELIGIBLE_MSG,
      fromUser, fromSite, toUser, toSite, amount,
    });
  }

  if (!path.startsWith("/api/")) return json({ ok: false, message: "Không tìm thấy API." }, 404);
  if (!isAdmin(db, request)) return json({ ok: false, message: "Cần đăng nhập admin." }, 401);

  if (path === "/api/accounts" && method === "GET") return json({ ok: true, accounts: db.accounts });

  if (path === "/api/accounts" && method === "POST") {
    const b = await readBody(request);
    const username = String(b.username || "").trim().slice(0, 40);
    const status = STATUSES.includes(b.status) ? b.status : "success";
    if (!username) return json({ ok: false, message: "Nhập tên tài khoản." }, 400);
    const found = db.accounts.find((a) => norm(a.username) === norm(username));
    if (found) found.status = status;
    else db.accounts.unshift({ id: uid(6), username, status, createdAt: new Date().toISOString() });
    await saveDb(kv, db);
    return json({ ok: true, accounts: db.accounts });
  }

  const m = path.match(/^\/api\/accounts\/([a-f0-9]+)\/(status|delete)$/);
  if (m && method === "POST") {
    const acc = db.accounts.find((a) => a.id === m[1]);
    if (!acc) return json({ ok: false, message: "Không tìm thấy tài khoản." }, 404);
    if (m[2] === "delete") db.accounts = db.accounts.filter((a) => a.id !== acc.id);
    else {
      const b = await readBody(request);
      acc.status = STATUSES.includes(b.status) ? b.status : acc.status;
    }
    await saveDb(kv, db);
    return json({ ok: true, accounts: db.accounts });
  }

  if (path === "/api/transfers" && method === "GET") return json({ ok: true, transfers: db.transfers });

  return json({ ok: false, message: "Không tìm thấy API." }, 404);
}
