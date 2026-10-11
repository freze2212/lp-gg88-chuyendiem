const TOKEN_KEY = "gg88_admin_token";
const $ = (id) => document.getElementById(id);
const fmt = (n) => Number(n || 0).toLocaleString("vi-VN");
const when = (iso) => (iso ? new Date(iso).toLocaleString("vi-VN") : "");
const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const token = () => sessionStorage.getItem(TOKEN_KEY) || "";

function show(board) {
  $("login-stage").hidden = board;
  $("board-stage").hidden = !board;
  $("btn-logout").hidden = !board;
}

async function api(path, body) {
  const opts = { method: body ? "POST" : "GET", headers: { Authorization: "Bearer " + token() } };
  if (body) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
  const r = await fetch(path, opts);
  const d = await r.json().catch(() => ({}));
  if (r.status === 401) { sessionStorage.removeItem(TOKEN_KEY); show(false); throw new Error(d.message || "Hết phiên admin."); }
  if (!r.ok || d.ok === false) throw new Error(d.message || "Lỗi API.");
  return d;
}

function statusSelect(acc) {
  return `<select class="status-select" data-id="${acc.id}" style="color:${acc.status === "success" ? "#15803d" : "#dc2626"}">
    <option value="success" ${acc.status === "success" ? "selected" : ""}>Thành công</option>
    <option value="ineligible" ${acc.status === "ineligible" ? "selected" : ""}>Chưa đủ điều kiện</option>
  </select>`;
}

async function loadAccounts() {
  const d = await api("/api/accounts");
  $("acc-rows").innerHTML = d.accounts.length
    ? d.accounts.map((a) => `<tr>
        <td><b>${esc(a.username)}</b></td>
        <td>${statusSelect(a)}</td>
        <td>${when(a.createdAt)}</td>
        <td><button class="btn-no" data-del="${a.id}">Xoá</button></td>
      </tr>`).join("")
    : '<tr><td colspan="4">Chưa có tài khoản. Thêm tài khoản ở trên.</td></tr>';
}

async function loadTransfers() {
  const d = await api("/api/transfers");
  $("tx-rows").innerHTML = d.transfers.length
    ? d.transfers.map((t) => `<tr>
        <td>${when(t.createdAt)}</td>
        <td>${esc(t.fromUser)}<br>${siteTag(t.fromSite)}</td>
        <td>${esc(t.toUser)}<br>${siteTag(t.toSite)}</td>
        <td>${fmt(t.amount)}</td>
        <td>${typeof t.balance === "number" ? fmt(t.balance) : "—"}</td>
        <td><span class="tag ${t.result === "success" ? "approved" : "rejected"}">${t.result === "success" ? "Thành công" : "Chưa đủ điều kiện"}</span></td>
      </tr>`).join("")
    : '<tr><td colspan="6">Chưa có giao dịch.</td></tr>';
}

async function loadSources() {
  const d = await api("/api/sources");
  $("src-rows").innerHTML = d.sources.length
    ? d.sources.map((s) => `<tr>
        <td><b>${esc(s.username)}</b></td>
        <td><div class="balance-edit"><input class="input" type="number" min="0" step="1" value="${s.balance}" data-bal="${s.id}" /><button class="btn-ok" data-save="${s.id}">Lưu</button></div></td>
        <td>${when(s.createdAt)}</td>
        <td><button class="btn-no" data-src-del="${s.id}">Xoá</button></td>
      </tr>`).join("")
    : '<tr><td colspan="4">Chưa có tài khoản nguồn. Thêm ở trên.</td></tr>';
}

$("src-rows").addEventListener("click", async (e) => {
  const save = e.target.closest("button[data-save]");
  const del = e.target.closest("button[data-src-del]");
  try {
    if (save) {
      const balance = Number(document.querySelector(`input[data-bal="${save.dataset.save}"]`).value);
      await api(`/api/sources/${save.dataset.save}/balance`, { balance });
      save.textContent = "Đã lưu";
      setTimeout(() => { save.textContent = "Lưu"; }, 1200);
    } else if (del) {
      if (!confirm("Xoá tài khoản nguồn này?")) return;
      await api(`/api/sources/${del.dataset.srcDel}/delete`, {});
      await loadSources();
    }
  } catch (err) { alert(err.message); }
});

$("src-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = $("src-user").value.trim();
  if (!username) return;
  try {
    await api("/api/sources", { username, balance: Number($("src-balance").value) });
    $("src-user").value = "";
    $("src-balance").value = "";
    await loadSources();
  } catch (err) { alert(err.message); }
});

$("acc-rows").addEventListener("change", async (e) => {
  const sel = e.target.closest("select[data-id]");
  if (!sel) return;
  sel.style.color = sel.value === "success" ? "#15803d" : "#dc2626";
  try { await api(`/api/accounts/${sel.dataset.id}/status`, { status: sel.value }); }
  catch (err) { alert(err.message); }
});

$("acc-rows").addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-del]");
  if (!btn) return;
  try { await api(`/api/accounts/${btn.dataset.del}/delete`, {}); await loadAccounts(); }
  catch (err) { alert(err.message); }
});

$("add-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = $("new-user").value.trim();
  if (!username) return;
  try {
    await api("/api/accounts", { username, status: $("new-status").value });
    $("new-user").value = "";
    await loadAccounts();
  } catch (err) { alert(err.message); }
});

document.querySelectorAll(".tabs button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("on", b === btn));
    const tab = btn.dataset.tab;
    for (const t of ["accounts", "sources", "transfers"]) $("tab-" + t).hidden = t !== tab;
    const load = { accounts: loadAccounts, sources: loadSources, transfers: loadTransfers }[tab];
    load().catch((err) => alert(err.message));
  });
});

$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("login-error").textContent = "";
  try {
    const r = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: $("username").value.trim(), password: $("password").value }),
    });
    const d = await r.json();
    if (!r.ok || !d.ok) throw new Error(d.message || "Đăng nhập thất bại.");
    sessionStorage.setItem(TOKEN_KEY, d.token);
    show(true);
    await loadAccounts();
  } catch (err) { $("login-error").textContent = err.message; }
});

$("btn-logout").addEventListener("click", () => { sessionStorage.removeItem(TOKEN_KEY); show(false); });

if (token()) { show(true); loadAccounts().catch(() => show(false)); }
else show(false);