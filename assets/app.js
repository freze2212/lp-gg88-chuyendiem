const BRAND = "GG88";
const LOGO = "./assets/logo-gg88.png";
const HISTORY_KEY = "gg88_transfer_history";
const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt = (n) => Number(n || 0).toLocaleString("vi-VN");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const guest = localStorage.getItem("gg88_guest") || "user" + Math.floor(10000 + Math.random() * 90000);
localStorage.setItem("gg88_guest", guest);
$("user-chip").textContent = guest;

fillSiteSelect($("from-site"), BRAND);
fillSiteSelect($("to-site"), BRAND);

const lines = ["⚡ <b>duyloi204</b> vừa nhận 2.000.000 điểm", "💎 <b>hoang123</b> vừa chuyển 100.000 điểm",
  "🔥 <b>ngocanh88</b> vừa nhận 300.000 điểm", "🎁 <b>phong161008</b> vừa nạp 500.000 điểm",
  "⚡ <b>tuan9x</b> vừa chuyển 1.000.000 điểm sang " + siteTag(BRAND)];
$("ticker").innerHTML = lines.concat(lines).map((l) => `<span>${l}</span>`).join("");

let turnstileToken = "";
let widgetId = null;
async function initTurnstile() {
  const cfg = await (await fetch("/api/config")).json();
  const render = () => {
    widgetId = turnstile.render("#turnstile", {
      sitekey: cfg.turnstileSitekey,
      language: "vi",
      callback: (t) => { turnstileToken = t; refresh(); },
      "expired-callback": () => { turnstileToken = ""; refresh(); },
      "error-callback": () => { turnstileToken = ""; refresh(); },
    });
  };
  if (window.turnstile) render();
  else { const iv = setInterval(() => { if (window.turnstile) { clearInterval(iv); render(); } }, 200); }
}
initTurnstile();

function values() {
  return {
    fromUser: $("from-user").value.trim(), fromSite: $("from-site").value,
    toUser: $("to-user").value.trim(), toSite: $("to-site").value,
    amount: Number($("amount").value),
  };
}
function ready() {
  const v = values();
  return v.fromUser && v.toUser && v.fromSite && v.toSite && v.amount > 0 && turnstileToken;
}
function refresh() {
  const ok = !!ready();
  $("btn-submit").disabled = !ok;
  $("btn-submit").classList.toggle("ready", ok);
}
$("transfer-form").addEventListener("input", refresh);
$("transfer-form").addEventListener("change", refresh);

const vipConditions = (brand) => `
  <div class="vip-cond">
    <div class="vip-head">
      <span class="vip-crown">👑</span>
      <div>ĐIỀU KIỆN CHUYỂN VIP SANG <b>${brand}</b><small>& KÍCH HOẠT TÀI KHOẢN</small></div>
    </div>
    <ul class="vip-list">
      <li><span class="vip-num">1</span><div><b>NẠP TRÊN 5 LẦN</b><em>Không bắt buộc nhiều hay ít</em></div></li>
      <li><span class="vip-num">2</span><div>NẠP TỪ <mark>1M</mark> – CƯỢC <mark>15M</mark><em>Tổng nạp tối thiểu 1 triệu, tổng cược 15 triệu</em></div></li>
    </ul>
    <div class="vip-note">
      <span>💡</span>
      <div>Có lãi <b>rút ra nạp lại</b> vẫn được tính tổng nạp. Đạt <b>nạp 1M – cược trên 15M</b> sẽ được
      <strong>DUYỆT NHANH CHÓNG TRONG NGÀY</strong> để tài khoản có thể chuyển VIP sang <b>${brand}</b>.</div>
    </div>
  </div>`;

const successSheet = (v, balance) => {
  const now = new Date();
  const at = `${now.toLocaleTimeString("vi-VN", { hour12: false })} ${now.toLocaleDateString("vi-VN")}`;
  const row = (icon, label, value, cls = "") => `<div class="ok-row"><span><i>${icon}</i>${label}</span><b class="${cls}">${value}</b></div>`;
  return `
    <div class="ok-sheet">
      <img class="ok-logo" src="${LOGO}" alt="${BRAND}" />
      <div class="ok-check"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></div>
      <h2 class="ok-title">CHUYỂN THÀNH CÔNG</h2>
      <div class="ok-date">Ngày chuyển: ${at}</div>
      <div class="ok-rows">
        ${row("👤", "Tài khoản nguồn:", esc(v.fromUser))}
        ${row("🎯", "Tài khoản đến:", esc(v.toUser))}
        ${row("💎", "Số điểm chuyển:", fmt(v.amount), "acc")}
        ${typeof balance === "number" ? row("💰", "Số dư còn lại:", fmt(balance) + " điểm") : ""}
      </div>
      <p class="ok-wish"><span class="wave">🎉</span> Chúc bạn chơi game vui vẻ! <span class="wave">🎮</span></p>
    </div>`;
};

function celebrate() {
  const card = $("modal");
  card.querySelectorAll(".fx").forEach((n) => n.remove());
  const brand = getComputedStyle(card).getPropertyValue("--brand").trim() || "#3b82f6";
  const colors = ["#f43f5e", "#f59e0b", "#22c55e", "#a855f7", "#38bdf8", brand];
  const fx = document.createElement("div");
  fx.className = "fx";
  const add = (cls, css) => { const n = document.createElement("i"); n.className = cls; n.style.cssText = css; fx.appendChild(n); };
  [[18, 20, 0], [82, 16, 300], [50, 6, 650]].forEach(([x, y, delay]) => {
    for (let i = 0; i < 14; i++) {
      add("spark", `left:${x}%;top:${y}%;--a:${(i * 360) / 14}deg;--d:${45 + Math.random() * 35}px;background:${colors[i % colors.length]};animation-delay:${delay}ms`);
    }
  });
  for (let i = 0; i < 36; i++) {
    add("confetti", `left:${Math.random() * 100}%;--x:${Math.random() * 80 - 40}px;--r:${Math.random() * 720 - 360}deg;background:${colors[i % colors.length]};animation-delay:${Math.random() * 700}ms`);
  }
  card.appendChild(fx);
  setTimeout(() => fx.remove(), 3600);
}

let balTimer = 0;
let balSeq = 0;
async function showSourceBalance() {
  const user = $("from-user").value.trim();
  const box = $("src-balance");
  const seq = ++balSeq;
  if (!user) { box.hidden = true; return; }
  try {
    const d = await (await fetch(`/api/source-balance?user=${encodeURIComponent(user)}`)).json();
    if (seq !== balSeq) return;
    if (d.ok && typeof d.balance === "number") {
      box.innerHTML = `💰 Số dư khả dụng: <b>${fmt(d.balance)}</b> điểm`;
      box.hidden = false;
    } else box.hidden = true;
  } catch { if (seq === balSeq) box.hidden = true; }
}
$("from-user").addEventListener("input", () => { clearTimeout(balTimer); balTimer = setTimeout(showSourceBalance, 400); });

function modal({ phase, title = "", text = "", extra = "", wide = false, actions = [] }) {
  const card = $("modal");
  card.className = "modal " + phase + (wide ? " wide" : "");
  card.classList.remove("in");
  void card.offsetWidth;
  card.classList.add("in");
  $("modal-spinner").style.display = phase === "loading" ? "block" : "none";
  $("modal-icon").textContent = phase === "bad" ? "⚠️" : "";
  $("modal-title").textContent = title;
  $("modal-title").hidden = !title;
  $("modal-text").innerHTML = text;
  $("modal-text").hidden = !text;
  $("modal-extra").innerHTML = extra;
  $("modal-actions").innerHTML = "";
  for (const a of actions) {
    const el = document.createElement(a.href ? "a" : "button");
    el.className = a.cls || "btn-ghost";
    el.textContent = a.label;
    if (a.href) { el.href = a.href; el.target = "_blank"; el.rel = "noopener"; }
    else el.onclick = a.onClick;
    $("modal-actions").appendChild(el);
  }
  $("overlay").classList.add("show");
}
const closeModal = () => $("overlay").classList.remove("show");

function remember(item) {
  const list = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  list.unshift(item);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 30)));
}

$("transfer-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("form-error").style.display = "none";
  if (!ready()) return;
  const v = values();
  const req = fetch("/api/transfers", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...v, turnstileToken }),
  }).then(async (r) => ({ status: r.status, data: await r.json() })).catch(() => ({ status: 0, data: { ok: false, message: "Mất kết nối, thử lại." } }));

  modal({
    phase: "loading", title: "Vui lòng chờ hệ thống kiểm tra tài khoản...",
    text: `Tài khoản nhận <b>${esc(v.toUser)}</b> · ${siteTag(v.toSite)}<br>Vui lòng không tắt trang.<div class="count" id="wait-count">10s</div>`,
  });
  for (let s = 10; s > 0; s--) { $("wait-count").textContent = s + "s"; await sleep(1000); }
  const { data } = await req;

  if (window.turnstile && widgetId !== null) turnstile.reset(widgetId);
  turnstileToken = "";
  refresh();

  if (!data.ok) {
    modal({ phase: "bad", title: "Giao dịch lỗi", text: esc(data.message), actions: [{ label: "Đóng", onClick: closeModal }] });
    return;
  }
  remember({ ...v, result: data.result, at: new Date().toISOString() });
  if (data.result === "success") {
    modal({ phase: "ok", extra: successSheet(v, data.balance), actions: [{ label: "ĐÓNG", cls: "btn-close-big", onClick: closeModal }] });
    celebrate();
    showSourceBalance();
  } else {
    modal({ phase: "bad", title: "Tài khoản chưa đủ điều kiện !!", text: `Tài khoản nhận <b>${esc(v.toUser)}</b> chưa đủ điều kiện nhận điểm.`, extra: vipConditions(BRAND), wide: true, actions: [{ label: "Đóng", onClick: closeModal }] });
  }
});

$("btn-history").onclick = () => {
  const list = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  $("history-list").innerHTML = list.length ? list.map((i) => `
    <div class="hist-item">
      <strong>${esc(i.fromUser)} (${siteTag(i.fromSite)}) → ${esc(i.toUser)} (${siteTag(i.toSite)})</strong>
      <div>${fmt(i.amount)} điểm</div>
      <span class="tag ${i.result === "success" ? "approved" : "rejected"}">${i.result === "success" ? "Thành công" : "Chưa đủ điều kiện"}</span>
    </div>`).join("") : '<p class="empty">Chưa có giao dịch nào.</p>';
  $("history-panel").classList.add("show");
};
$("btn-close-history").onclick = () => $("history-panel").classList.remove("show");
