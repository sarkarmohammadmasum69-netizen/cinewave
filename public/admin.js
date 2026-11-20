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
  if (!res.ok) throw new Error(data.error || "The request could not be completed.");
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
  e.preventDefault(); loginMessage.textContent = "Logging in...";
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
  if (!movies.length) { list.innerHTML = '<p class="security-note">No movies yet. Add the first one using the form on the left.</p>'; return; }
  list.innerHTML = movies.map(m => `<div class="admin-movie-row">
    ${m.poster ? `<img src="${m.poster}" alt="">` : '<div class="admin-thumb"></div>'}
    <div class="admin-row-info"><b>${esc(m.title)}</b><small>${esc(m.category)} ${m.release_year ? " • " + m.release_year : ""}</small></div>
    <div class="row-actions"><button class="outline-btn" data-edit="${m.id}">Edit</button><button class="outline-btn" data-delete="${m.id}">Delete</button></div>
  </div>`).join("");
  list.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => editMovie(b.dataset.edit)));
  list.querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", () => deleteMovie(b.dataset.delete)));
}
async function editMovie(id) {
  const m = await api("/api/movies/" + id);
  editingId = Number(id);
  for (const key of ["title","category","release_year","duration","description"]) movieForm.elements[key].value = m[key] || "";
  movieForm.elements.movieId.value = id;
  document.getElementById("formTitle").textContent = "Edit movie";
  document.getElementById("saveMovieBtn").textContent = "Save changes →";
  document.getElementById("cancelEdit").classList.remove("hidden");
  formMessage.textContent = "If you don't add a new video or poster, the previous file stays.";
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function resetMovieForm() {
  editingId = null; movieForm.reset(); movieForm.elements.movieId.value = "";
  movieForm.elements.category.value = "Other";
  document.getElementById("formTitle").textContent = "Add a new movie";
  document.getElementById("saveMovieBtn").textContent = "Save movie →";
  document.getElementById("cancelEdit").classList.add("hidden");
  formMessage.textContent = "";
}
document.getElementById("cancelEdit").addEventListener("click", resetMovieForm);
movieForm.addEventListener("submit", async e => {
  e.preventDefault();
  const btn = document.getElementById("saveMovieBtn");
  btn.disabled = true; btn.textContent = "Uploading...";
  formMessage.textContent = "Uploading a file may take a while.";
  try {
    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `/api/admin/movies/${editingId}` : "/api/admin/movies";
    await api(url, { method, body: new FormData(movieForm) });
    resetMovieForm(); formMessage.textContent = "Movie saved successfully."; refreshDashboard();
  } catch (err) { formMessage.textContent = err.message; }
  finally { btn.disabled = false; btn.textContent = editingId ? "Save changes →" : "Save movie →"; }
});
async function deleteMovie(id) {
  if (!confirm("Delete this movie and its uploaded files?")) return;
  try { await api("/api/admin/movies/" + id, { method: "DELETE" }); refreshDashboard(); }
  catch (err) { alert(err.message); }
}
document.getElementById("refreshBtn").addEventListener("click", refreshDashboard);
checkLogin();