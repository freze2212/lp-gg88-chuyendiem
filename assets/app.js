const HISTORY_KEY = "gg88_transfer_history";
const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt = (n) => Number(n || 0).toLocaleString("vi-VN");

const guest = localStorage.getItem("gg88_guest") || "user" + Math.floor(10000 + Math.random() * 90000);
localStorage.setItem("gg88_guest", guest);
$("user-chip").textContent = guest;

fillSiteSelect($("from-site"));
fillSiteSelect($("to-site"), "GG88");

let redirectUrl = "";
fetch("/domains.json").then((r) => r.json()).then((dj) => {
  const h = location.hostname.toLowerCase().replace(/^www\./, "");
  const e = dj[h] || dj["www." + h];
  const t = e && (e.main_url || e.url || (typeof e === "string" ? e : ""));
  if (t) redirectUrl = t;
}).catch(() => {});

const lines = ["⚡ <b>duyloi204</b> vừa nhận 2.000.000 VNĐ", "💎 <b>hoang123</b> vừa chuyển 100.000 VNĐ",
  "🔥 <b>ngocanh88</b> vừa nhận 300.000 VNĐ", "🎁 <b>phong161008</b> vừa nạp 500.000 VNĐ",
  "⚡ <b>tuan9x</b> vừa chuyển 1.000.000 VNĐ sang " + siteTag("GG88")];
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

function modal({ phase, title, text, actions = [] }) {
  const card = $("modal");
  card.className = "modal " + phase;
  card.classList.remove("in");
  void card.offsetWidth;
  card.classList.add("in");
  $("modal-spinner").style.display = phase === "loading" ? "block" : "none";
  $("modal-icon").textContent = phase === "ok" ? "🎉" : phase === "bad" ? "⚠️" : "";
  $("modal-title").textContent = title;
  $("modal-text").innerHTML = text || "";
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

  modal({ phase: "loading", title: "Đang xử lý giao dịch...", text: "Vui lòng không tắt trang." });
  await sleep(1500);
  modal({ phase: "loading", title: "Đang kiểm tra tài khoản...", text: `Tài khoản <b>${v.fromUser}</b> · ${siteTag(v.fromSite)}` });
  const [{ data }] = await Promise.all([req, sleep(2000)]);

  if (window.turnstile && widgetId !== null) turnstile.reset(widgetId);
  turnstileToken = "";
  refresh();

  if (!data.ok) {
    modal({ phase: "bad", title: "Giao dịch lỗi", text: data.message, actions: [{ label: "Đóng", onClick: closeModal }] });
    return;
  }
  remember({ ...v, result: data.result, at: new Date().toISOString() });
  if (data.result === "success") {
    const actions = [{ label: "Đóng", onClick: closeModal }];
    if (redirectUrl) actions.unshift({ label: "Vào GG88", cls: "btn-go", href: redirectUrl });
    modal({
      phase: "ok", title: "Chúc mừng, chuyển điểm thành công!",
      text: `<b>${fmt(v.amount)} VNĐ</b><br>${v.fromUser} (${siteTag(v.fromSite)}) → ${v.toUser} (${siteTag(v.toSite)})`,
      actions,
    });
  } else {
    modal({ phase: "bad", title: "Tài khoản chưa đủ điều kiện !!", text: `Tài khoản <b>${v.fromUser}</b> chưa đủ điều kiện chuyển điểm.`, actions: [{ label: "Đóng", onClick: closeModal }] });
  }
});

$("btn-history").onclick = () => {
  const list = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  $("history-list").innerHTML = list.length ? list.map((i) => `
    <div class="hist-item">
      <strong>${i.fromUser} (${siteTag(i.fromSite)}) → ${i.toUser} (${siteTag(i.toSite)})</strong>
      <div>${fmt(i.amount)} VNĐ</div>
      <span class="tag ${i.result === "success" ? "approved" : "rejected"}">${i.result === "success" ? "Thành công" : "Chưa đủ điều kiện"}</span>
    </div>`).join("") : '<p class="empty">Chưa có giao dịch nào.</p>';
  $("history-panel").classList.add("show");
};
$("btn-close-history").onclick = () => $("history-panel").classList.remove("show");
