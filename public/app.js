const grid = document.getElementById("movieGrid");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const modal = document.getElementById("movieModal");
const modalContent = document.getElementById("modalContent");
let allMovies = [];

async function loadMovies() {
  const params = new URLSearchParams();
  if (searchInput.value.trim()) params.set("q", searchInput.value.trim());
  if (categoryFilter.value) params.set("category", categoryFilter.value);
  grid.innerHTML = '<div class="empty">Loading movies...</div>';
  try {
    const res = await fetch("/api/movies?" + params.toString());
    allMovies = await res.json();
    renderMovies(allMovies);
    const cats = [...new Set(allMovies.map(m => m.category).filter(Boolean))];
    const current = categoryFilter.value;
    categoryFilter.innerHTML = '<option value="">All categories</option>' + cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
    categoryFilter.value = current;
  } catch {
    grid.innerHTML = '<div class="empty">Could not connect to the server.</div>';
  }
}
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function renderMovies(movies) {
  if (!movies.length) { grid.innerHTML = '<div class="empty">No movies added yet. Upload movies from the admin panel.</div>'; return; }
  grid.innerHTML = movies.map(m => `
    <article class="movie-card" data-id="${m.id}">
      <div class="movie-poster">${m.poster ? `<img loading="lazy" src="${m.poster}" alt="${escapeHtml(m.title)}">` : `<div class="no-poster">${escapeHtml(m.title.slice(0,22))}</div>`}<span class="play-chip">▶</span></div>
      <div class="movie-info"><h3>${escapeHtml(m.title)}</h3><p>${escapeHtml(m.category || "Other")} ${m.release_year ? " • " + m.release_year : ""}</p></div>
    </article>`).join("");
  grid.querySelectorAll(".movie-card").forEach(card => card.addEventListener("click", () => openMovie(card.dataset.id)));
}
async function openMovie(id) {
  const res = await fetch("/api/movies/" + id);
  const m = await res.json();
  if (!res.ok) return;
  modalContent.innerHTML = `<div class="movie-detail">
    ${m.poster ? `<img src="${m.poster}" alt="${escapeHtml(m.title)}">` : '<div class="detail-placeholder"></div>'}
    <div><div class="eyebrow">CINEWAVE MOVIE</div><h2>${escapeHtml(m.title)}</h2><p>${escapeHtml(m.category || "Other")} ${m.release_year ? " • " + m.release_year : ""} ${m.duration ? " • " + escapeHtml(m.duration) : ""}</p><p>${escapeHtml(m.description || "No description added for this movie yet.")}</p></div>
    <div style="grid-column:1/-1">${m.video ? `<video controls playsinline preload="metadata" src="${m.video}">Your browser does not support video playback.</video>` : '<div class="empty">🎬 Video coming soon — enjoy the poster card for now.</div>'}</div>
  </div>`;
  modal.classList.remove("hidden");
}
document.getElementById("closeModal").addEventListener("click", () => modal.classList.add("hidden"));
modal.addEventListener("click", e => { if (e.target === modal) modal.classList.add("hidden"); });
searchInput.addEventListener("input", debounce(loadMovies, 250));
categoryFilter.addEventListener("change", loadMovies);
function debounce(fn, delay) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); }; }
document.getElementById("year").textContent = new Date().getFullYear();
loadMovies();