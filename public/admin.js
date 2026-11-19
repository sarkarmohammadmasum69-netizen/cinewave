const loginPanel = document.getElementById("loginPanel");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const movieForm = document.getElementById("movieForm");
const formMessage = document.getElementById("formMessage");
const list = document.getElementById("adminMovieList");
let editingId = null;

async function api(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "অনুরোধটি সম্পন্ন হয়নি।");
  return data;
}
async function checkLogin() {
  try {
    const me = await api("/api/admin/me");
    loginPanel.classList.toggle("hidden", me.loggedIn);
    dashboard.classList.toggle("hidden", !me.loggedIn);
    if (me.loggedIn) refreshDashboard();
  } catch {}
}
loginForm.addEventListener("submit", async e => {
  e.preventDefault(); loginMessage.textContent = "লগইন হচ্ছে...";
  const fd = new FormData(loginForm);
  try {
    await api("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(fd)) });
    loginForm.reset(); loginMessage.textContent = ""; checkLogin();
  } catch (err) { loginMessage.textContent = err.message; }
});
document.getElementById("logoutBtn").addEventListener("click", async () => {
  try { await api("/api/admin/logout", { method: "POST" }); } finally { checkLogin(); }
});
async function refreshDashboard() {
  try {
    const stats = await api("/api/admin/stats");
    document.getElementById("totalMovies").textContent = stats.total;
    document.getElementById("totalCategories").textContent = stats.categories;
    const movies = await api("/api/movies");
    renderAdminList(movies);
  } catch (err) { list.textContent = err.message; }
}
function esc(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c])); }
function renderAdminList(movies) {
  if (!movies.length) { list.innerHTML = '<p class="security-note">এখনো কোনো মুভি নেই। বাম পাশের ফর্ম থেকে প্রথম মুভিটি যোগ করুন।</p>'; return; }
  list.innerHTML = movies.map(m => `<div class="admin-movie-row">
    ${m.poster ? `<img src="${m.poster}" alt="">` : '<div class="admin-thumb"></div>'}
    <div class="admin-row-info"><b>${esc(m.title)}</b><small>${esc(m.category)} ${m.release_year ? " • " + m.release_year : ""}</small></div>
    <div class="row-actions"><button class="outline-btn" data-edit="${m.id}">এডিট</button><button class="outline-btn" data-delete="${m.id}">ডিলিট</button></div>
  </div>`).join("");
  list.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => editMovie(b.dataset.edit)));
  list.querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", () => deleteMovie(b.dataset.delete)));
}
async function editMovie(id) {
  const m = await api("/api/movies/" + id);
  editingId = Number(id);
  for (const key of ["title","category","release_year","duration","description"]) movieForm.elements[key].value = m[key] || "";
  movieForm.elements.movieId.value = id;
  document.getElementById("formTitle").textContent = "মুভি এডিট করুন";
  document.getElementById("saveMovieBtn").textContent = "পরিবর্তন সেভ করুন →";
  document.getElementById("cancelEdit").classList.remove("hidden");
  formMessage.textContent = "নতুন ভিডিও বা পোস্টার না দিলে আগের ফাইল থাকবে।";
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function resetMovieForm() {
  editingId = null; movieForm.reset(); movieForm.elements.movieId.value = "";
  movieForm.elements.category.value = "অন্যান্য";
  document.getElementById("formTitle").textContent = "নতুন মুভি যোগ করুন";
  document.getElementById("saveMovieBtn").textContent = "মুভি সেভ করুন →";
  document.getElementById("cancelEdit").classList.add("hidden");
  formMessage.textContent = "";
}
document.getElementById("cancelEdit").addEventListener("click", resetMovieForm);
movieForm.addEventListener("submit", async e => {
  e.preventDefault();
  const video = movieForm.elements.video.files[0];
  if (!editingId && !video) { formMessage.textContent = "ভিডিও ফাইল নির্বাচন করুন।"; return; }
  const btn = document.getElementById("saveMovieBtn");
  btn.disabled = true; btn.textContent = "আপলোড হচ্ছে...";
  formMessage.textContent = "ফাইল আপলোড হতে সময় লাগতে পারে।";
  try {
    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `/api/admin/movies/${editingId}` : "/api/admin/movies";
    await api(url, { method, body: new FormData(movieForm) });
    resetMovieForm(); formMessage.textContent = "মুভি সফলভাবে সেভ হয়েছে।"; refreshDashboard();
  } catch (err) { formMessage.textContent = err.message; }
  finally { btn.disabled = false; btn.textContent = editingId ? "পরিবর্তন সেভ করুন →" : "মুভি সেভ করুন →"; }
});
async function deleteMovie(id) {
  if (!confirm("এই মুভি ও এর আপলোড করা ফাইল ডিলিট করবেন?")) return;
  try { await api("/api/admin/movies/" + id, { method: "DELETE" }); refreshDashboard(); }
  catch (err) { alert(err.message); }
}
document.getElementById("refreshBtn").addEventListener("click", refreshDashboard);
checkLogin();