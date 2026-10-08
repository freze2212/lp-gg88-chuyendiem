const TOKEN_KEY = "gg88_admin_token";
const loginStage = document.getElementById("login-stage");
const boardStage = document.getElementById("board-stage");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const rows = document.getElementById("rows");
const logoutBtn = document.getElementById("btn-logout");

function token() { return sessionStorage.getItem(TOKEN_KEY) || ""; }

function showLogin() {
  loginStage.hidden = false;
  boardStage.hidden = true;
  logoutBtn.hidden = true;
}
function showBoard() {
  loginStage.hidden = true;
  boardStage.hidden = false;
  logoutBtn.hidden = false;
}

function fmt(n) { return Number(n || 0).toLocaleString("vi-VN"); }
function when(iso) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleString("vi-VN"); } catch { return iso; }
}
function statusLabel(status) {
  if (status === "approved") return "Đã duyệt";
  if (status === "rejected") return "Từ chối";
  return "Chờ duyệt";
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (token()) headers.Authorization = "Bearer " + token();
  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    sessionStorage.removeItem(TOKEN_KEY);
    showLogin();
    throw new Error(data.message || "Hết phiên admin.");
  }
  if (!res.ok || data.ok === false) throw new Error(data.message || "Lỗi API.");
  return data;
}

async function loadRows() {
  const data = await api("/api/transfers");
  if (!data.items.length) {
    rows.innerHTML = '<tr><td colspan="6">Chưa có lệnh nào.</td></tr>';
    return;
  }
  rows.innerHTML = data.items.map((item) => `
    <tr>
      <td>${when(item.createdAt)}</td>
      <td>${item.fromUser}<br><span style="color:#6b7280">${item.fromSite}</span></td>
      <td>${item.toUser}<br><span style="color:#6b7280">GG88</span></td>
      <td>${fmt(item.amount)}</td>
      <td><span class="tag ${item.status}">${statusLabel(item.status)}</span></td>
      <td>${item.status === "pending" ? `
        <div class="actions">
          <button class="btn-ok" data-act="approve" data-id="${item.id}">Duyệt</button>
          <button class="btn-no" data-act="reject" data-id="${item.id}">Từ chối</button>
        </div>` : ""}</td>
    </tr>
  `).join("");
}

rows.addEventListener("click", async (event) => {
  const btn = event.target.closest("button[data-act]");
  if (!btn) return;
  btn.disabled = true;
  try {
    await api(`/api/transfers/${btn.dataset.id}/${btn.dataset.act}`, { method: "POST" });
    await loadRows();
  } catch (err) {
    alert(err.message);
    btn.disabled = false;
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";
  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: document.getElementById("username").value.trim(),
        password: document.getElementById("password").value,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.message || "Đăng nhập thất bại.");
    sessionStorage.setItem(TOKEN_KEY, data.token);
    showBoard();
    await loadRows();
  } catch (err) {
    loginError.textContent = err.message;
  }
});

logoutBtn.addEventListener("click", () => {
  sessionStorage.removeItem(TOKEN_KEY);
  showLogin();
});

if (token()) {
  showBoard();
  loadRows().catch(() => showLogin());
  setInterval(() => { if (token()) loadRows().catch(() => {}); }, 3000);
} else {
  showLogin();
}
