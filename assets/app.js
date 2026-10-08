const WAIT_MS = 120000;
const POLL_MS = 2000;
const HISTORY_KEY = "gg88_transfer_history";

const guest = (() => {
  const key = "gg88_guest";
  let id = localStorage.getItem(key);
  if (!id) {
    id = "user" + Math.floor(10000 + Math.random() * 90000);
    localStorage.setItem(key, id);
  }
  return id;
})();

const chip = document.getElementById("user-chip");
if (chip) chip.textContent = guest;

let redirectUrl = "";
fetch("/domains.json")
  .then((r) => r.json())
  .then((dj) => {
    const host = (location.hostname || "").toLowerCase().replace(/^www\./, "");
    const entry = dj?.[host] || dj?.["www." + host] || dj?.[location.hostname];
    const target = entry && (entry.main_url || entry.url || entry.link || (typeof entry === "string" ? entry : ""));
    if (target) redirectUrl = target;
  })
  .catch(() => {});

const tickerLines = [
  "⚡ duyloi204 vừa nhận 2.000.000 VNĐ",
  "💎 hoang123 vừa chuyển 100.000 VNĐ",
  "🔥 ngocanh88 vừa nhận 300.000 VNĐ",
  "🎁 phong161008 vừa nạp 500.000 VNĐ",
  "⚡ GG88 vừa duyệt chuyển 1.000.000 VNĐ",
];
const ticker = document.getElementById("ticker");
if (ticker) {
  const html = tickerLines.concat(tickerLines).map((line) => `<span>${line}</span>`).join("");
  ticker.innerHTML = html;
}

const form = document.getElementById("transfer-form");
const submitBtn = document.getElementById("btn-submit");
const human = document.getElementById("human");
const formError = document.getElementById("form-error");

function formReady() {
  const fromUser = document.getElementById("from-user").value.trim();
  const toUser = document.getElementById("to-user").value.trim();
  const fromSite = document.getElementById("from-site").value;
  const amount = Number(document.getElementById("amount").value);
  return fromUser && toUser && fromSite && amount > 0 && human.checked;
}

function refreshSubmit() {
  const ok = formReady();
  submitBtn.disabled = !ok;
  submitBtn.classList.toggle("ready", ok);
}

form.addEventListener("input", refreshSubmit);
form.addEventListener("change", refreshSubmit);

function readHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch { return []; }
}
function writeHistory(items) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 30)));
}
function remember(item) {
  const items = readHistory().filter((x) => x.id !== item.id);
  items.unshift(item);
  writeHistory(items);
}

const overlay = document.getElementById("overlay");
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modal-title");
const modalText = document.getElementById("modal-text");
const modalCount = document.getElementById("modal-count");
const modalActions = document.getElementById("modal-actions");
let pollTimer = null;

function showModal({ title, text, count = "", tone = "", actions = [] }) {
  modal.className = "modal" + (tone ? " " + tone : "");
  modalTitle.textContent = title;
  modalText.textContent = text;
  modalCount.textContent = count;
  modalActions.innerHTML = "";
  for (const action of actions) {
    const el = document.createElement(action.href ? "a" : "button");
    el.className = action.className || "btn-ghost";
    el.textContent = action.label;
    if (action.href) {
      el.href = action.href;
      el.target = "_blank";
      el.rel = "noopener noreferrer";
    } else {
      el.type = "button";
      el.addEventListener("click", action.onClick);
    }
    modalActions.appendChild(el);
  }
  overlay.classList.add("show");
}

function closeModal() {
  overlay.classList.remove("show");
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

function fmt(n) {
  return Number(n || 0).toLocaleString("vi-VN");
}

function statusLabel(status) {
  if (status === "approved") return "Đã duyệt";
  if (status === "rejected") return "Không duyệt";
  if (status === "timeout") return "Hết giờ duyệt";
  return "Chờ duyệt";
}

async function pollUntil(id, started) {
  const tick = async () => {
    const left = WAIT_MS - (Date.now() - started);
    if (left <= 0) {
      clearInterval(pollTimer);
      pollTimer = null;
      const items = readHistory();
      const found = items.find((x) => x.id === id);
      if (found && found.status === "pending") {
        found.status = "timeout";
        writeHistory(items);
      }
      showModal({
        tone: "bad",
        title: "Chuyển điểm thất bại",
        text: "Admin không bấm duyệt. Điểm không được chuyển.",
        actions: [{ label: "Đóng", onClick: closeModal }],
      });
      return;
    }
    modalCount.textContent = "Còn " + Math.ceil(left / 1000) + " giây. Không duyệt thì giao dịch lỗi.";
    try {
      const res = await fetch("/api/transfers/" + id);
      const data = await res.json();
      if (!data.ok) return;
      if (data.status === "pending") return;
      clearInterval(pollTimer);
      pollTimer = null;
      remember({ ...data, status: data.status });
      if (data.status === "approved") {
        const actions = [{ label: "Đóng", className: "btn-ghost", onClick: closeModal }];
        if (redirectUrl) actions.unshift({ label: "Vào GG88", className: "btn-go", href: redirectUrl });
        showModal({
          tone: "ok",
          title: "Chuyển điểm thành công",
          text: `${data.fromUser} (${data.fromSite}) → ${data.toUser} (GG88): ${fmt(data.amount)} VNĐ.`,
          actions,
        });
      } else {
        showModal({
          tone: "bad",
          title: "Chuyển điểm thất bại",
          text: data.message || "Admin không duyệt. Điểm không được chuyển.",
          actions: [{ label: "Đóng", onClick: closeModal }],
        });
      }
    } catch { /* giữ trạng thái chờ */ }
  };
  await tick();
  pollTimer = setInterval(tick, POLL_MS);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formError.style.display = "none";
  if (!formReady()) return;
  submitBtn.disabled = true;
  const payload = {
    fromUser: document.getElementById("from-user").value.trim(),
    fromSite: document.getElementById("from-site").value,
    toUser: document.getElementById("to-user").value.trim(),
    toSite: "GG88",
    amount: Number(document.getElementById("amount").value),
  };
  try {
    const res = await fetch("/api/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.message || "Không gửi được lệnh.");
    remember(data);
    showModal({
      title: "Đang chờ admin duyệt",
      text: "Lệnh đã gửi. Admin bấm duyệt thì điểm mới chuyển. Không bấm thì giao dịch báo lỗi.",
    });
    pollUntil(data.id, Date.now());
  } catch (err) {
    formError.textContent = err.message || "Không gửi được lệnh.";
    formError.style.display = "block";
  } finally {
    refreshSubmit();
  }
});

const historyPanel = document.getElementById("history-panel");
const historyList = document.getElementById("history-list");

async function renderHistory() {
  const items = readHistory();
  if (!items.length) {
    historyList.innerHTML = '<p class="empty">Chưa có lệnh chuyển nào trên trình duyệt này.</p>';
    return;
  }
  const fresh = [];
  for (const item of items) {
    if (item.status === "pending") {
      try {
        const data = await (await fetch("/api/transfers/" + item.id)).json();
        if (data.ok) fresh.push({ ...item, ...data });
        else fresh.push(item);
      } catch { fresh.push(item); }
    } else fresh.push(item);
  }
  writeHistory(fresh);
  historyList.innerHTML = fresh.map((item) => `
    <div class="hist-item">
      <strong>${item.fromUser} (${item.fromSite}) → ${item.toUser} (GG88)</strong>
      <div>${fmt(item.amount)} VNĐ</div>
      <span class="tag ${item.status}">${statusLabel(item.status)}</span>
    </div>
  `).join("");
}

document.getElementById("btn-history").addEventListener("click", () => {
  historyPanel.classList.add("show");
  renderHistory();
});
document.getElementById("btn-close-history").addEventListener("click", () => {
  historyPanel.classList.remove("show");
});
