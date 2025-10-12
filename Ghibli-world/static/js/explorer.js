document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("moviesGrid");
  const tpl = document.getElementById("movieCardTpl");
  const searchInput = document.getElementById("searchInput");
  const filterChips = document.querySelectorAll(".filter-chip");

  let allMovies = [];
  let activeFilter = "all";

  function render(list) {
    const cards = Array.from(grid.querySelectorAll(".movie-card"));
    cards.forEach(c => c.remove());

    const emptyState = grid.querySelector(".empty-state");
    emptyState?.remove();

    if (!list.length) {
      grid.insertAdjacentHTML("beforeend", "<p class='card empty-state' style='grid-column:1/-1;text-align:center'>No films match just yet – try another filter.</p>");
      return;
    }

    list.forEach(m => {
      const node = tpl.content.cloneNode(true);
      const img = node.querySelector(".movie-poster");
      const card = node.querySelector(".movie-card");
      const title = node.querySelector(".movie-title");
      const desc = node.querySelector(".movie-desc");
      const meta = node.querySelector(".movie-meta");

      if (img) {
        img.src = m.image || m.poster || m.movie_banner || "";
        img.alt = m.title;
        img.onerror = () => { img.style.display = "none"; };
      }
      if (card && !m.poster && m.movie_banner) {
        card.style.backgroundImage = `url(${m.movie_banner})`;
        card.style.backgroundSize = "cover";
        card.style.backgroundPosition = "center";
      }
      if (title) title.textContent = m.title;
      if (desc) {
        const full = m.description || "";
        desc.textContent = full.length > 180 ? `${full.slice(0, 180)}…` : full;
      }
      if (meta) {
        const chips = [];
        if (m.year) chips.push(`<span class="chip">${m.year}</span>`);
        if (m.director) chips.push(`<span class="chip">Director: ${m.director}</span>`);
        if (m.rt_score) chips.push(`<span class="chip">RT ${m.rt_score}</span>`);
        if (m.running_time) chips.push(`<span class="chip">${m.running_time} min</span>`);
        meta.innerHTML = chips.join("");
      }

      grid.appendChild(node);
    });
  }

  function matchesFilter(movie) {
    const year = parseInt(movie.year, 10);
    const score = parseInt(movie.rt_score, 10);
    switch (activeFilter) {
      case "rt90":
        return !Number.isNaN(score) && score >= 90;
      case "classic":
        return !Number.isNaN(year) && year < 2000;
      case "modern":
        return !Number.isNaN(year) && year >= 2000;
      default:
        return true;
    }
  }

  function applyFilter() {
    const q = (searchInput?.value || "").toLowerCase().trim();
    const filteredByText = allMovies.filter(m => {
      if (!q) return true;
      return [m.title, m.description, m.director, String(m.year)]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q));
    });
    const filtered = filteredByText.filter(matchesFilter);
    render(filtered);
  }

  try {
    const res = await fetch("/api/movies");
    allMovies = await res.json();
    render(allMovies);
  } catch (err) {
    grid.insertAdjacentHTML("beforeend", "<p>Failed to load movies.</p>");
    console.error(err);
  }

  searchInput?.addEventListener("input", applyFilter);
  filterChips.forEach(chip => {
    chip.addEventListener("click", () => {
      filterChips.forEach(c => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      activeFilter = chip.dataset.filter || "all";
      applyFilter();
    });
  });
});
