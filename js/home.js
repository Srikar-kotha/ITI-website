const FALLBACK_TRADES = [];

const state = {
  trades: [],
  language: localStorage.getItem("iti-language") || "en",
  category: "All",
  query: ""
};

// Shared IntersectionObserver for scroll-reveal. Re-built on every renderTrades()
// because the elements it watches are torn down and recreated.
let revealObserver = null;

const elements = {
  grid: document.getElementById("tradeGrid"),
  count: document.getElementById("resultCount"),
  total: document.getElementById("totalTrades"),
  itiTotal: document.getElementById("itiTrades"),
  atcTotal: document.getElementById("atcTrades"),
  search: document.getElementById("searchInput"),
  filters: document.getElementById("categoryFilters"),
  empty: document.getElementById("emptyState"),
  languageToggle: document.getElementById("languageToggle")
};

async function loadTrades() {
  try {
    const response = await fetch("data/trades.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Unable to load trades.json");
    }
    return await response.json();
  } catch (error) {
    console.warn("Using built-in fallback data because JSON could not be loaded.", error);
    return window.TRADES_FALLBACK || FALLBACK_TRADES;
  }
}

function text(trade, key) {
  return trade[`${key}_${state.language}`] || trade[`${key}_en`] || "";
}

function label(en, te) {
  return state.language === "te" ? te : en;
}

function updateLanguageUi() {
  document.documentElement.lang = state.language === "te" ? "te" : "en";
  elements.languageToggle.textContent = state.language === "te" ? "English" : "తెలుగు";
  elements.search.placeholder = label("Search by trade name or category", "ట్రేడ్ పేరు లేదా కేటగిరీ ద్వారా వెతకండి");
}

function getFilteredTrades() {
  const query = state.query.trim().toLowerCase();
  return state.trades.filter((trade) => {
    const matchesCategory = state.category === "All" || trade.category === state.category;
    const searchText = [
      trade.category,
      trade.program_type,
      trade.program_type_en,
      trade.program_type_te,
      trade.name_en,
      trade.name_te,
      trade.short_description_en,
      trade.short_description_te
    ].join(" ").toLowerCase();

    return matchesCategory && (!query || searchText.includes(query));
  });
}

function renderTrades() {
  // Disconnect the prior reveal observer and strip reveal state from any
  // existing cards/groups so re-renders (search, filter, language) don't
  // leave them stuck at opacity: 0.
  if (revealObserver) {
    revealObserver.disconnect();
    revealObserver = null;
  }
  elements.grid.querySelectorAll(".trade-card, .trade-group").forEach((el) => {
    el.classList.remove("is-revealed");
    el.style.removeProperty("--reveal-delay");
  });

  const filtered = getFilteredTrades();
  const itiTrades = state.trades.filter((trade) => trade.program_type === "ITI");
  const atcTrades = state.trades.filter((trade) => trade.program_type === "ATC");
  elements.total.textContent = state.trades.length;
  elements.itiTotal.textContent = itiTrades.length;
  elements.atcTotal.textContent = atcTrades.length;
  elements.count.textContent = label(`${filtered.length} trade${filtered.length === 1 ? "" : "s"} found`, `${filtered.length} ట్రేడ్లు కనిపించాయి`);
  elements.empty.hidden = filtered.length > 0;

  const renderCard = (trade) => `
    <article class="trade-card">
      <div class="card-pills">
        <span class="type-pill ${trade.program_type === "ATC" ? "atc" : "iti"}">${text(trade, "program_type")}</span>
        <span class="category-pill">${trade.category}</span>
      </div>
      <h3>${text(trade, "name")}</h3>
      <ul class="meta-list">
        <li><strong>${label("Duration", "వ్యవధి")}:</strong> <span>${text(trade, "duration")}</span></li>
        <li><strong>${label("Eligibility", "అర్హత")}:</strong> <span>${text(trade, "eligibility")}</span></li>
      </ul>
      <p>${text(trade, "short_description")}</p>
      <div class="card-actions">
        <a class="button primary" href="trade.html?id=${encodeURIComponent(trade.id)}">${label("View Details", "వివరాలు చూడండి")}</a>
      </div>
    </article>
  `;

  const renderGroup = (type, heading, description) => {
    const trades = filtered.filter((trade) => trade.program_type === type);
    if (!trades.length) return "";

    return `
      <section class="trade-group">
        <div class="trade-group-heading">
          <div>
            <span>${type}</span>
            <h3>${heading}</h3>
          </div>
          <p>${description}</p>
        </div>
        <div class="trade-grid">
          ${trades.map(renderCard).join("")}
        </div>
      </section>
    `;
  };

  elements.grid.innerHTML = [
    renderGroup("ITI", label("ITI Trades", "ITI ట్రేడ్లు"), label("Traditional ITI vocational courses for practical job-ready skills.", "ప్రాక్టికల్ ఉద్యోగ నైపుణ్యాల కోసం సంప్రదాయ ITI వొకేషనల్ కోర్సులు.")),
    renderGroup("ATC", label("ATC Trades", "ATC ట్రేడ్లు"), label("Advanced Technology Centre courses focused on modern industry technologies.", "ఆధునిక పరిశ్రమ టెక్నాలజీలపై దృష్టి పెట్టిన Advanced Technology Centre కోర్సులు."))
  ].join("");

  setupReveal();
}

function setupReveal() {
  // Respect reduced motion: make everything visible synchronously, no observer.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    elements.grid.querySelectorAll(".trade-card, .trade-group").forEach((el) => {
      el.classList.add("is-revealed");
    });
    return;
  }

  // Apply stagger delays (cards within a group: 60ms; groups: 0/120ms).
  const groups = elements.grid.querySelectorAll(".trade-group");
  groups.forEach((group, groupIndex) => {
    group.style.setProperty("--reveal-delay", `${groupIndex * 120}ms`);
    const cards = group.querySelectorAll(".trade-card");
    cards.forEach((card, cardIndex) => {
      card.style.setProperty("--reveal-delay", `${groupIndex * 120 + cardIndex * 60}ms`);
    });
  });

  // Single shared observer watches all .trade-card and .trade-group elements.
  revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
  );

  elements.grid.querySelectorAll(".trade-card, .trade-group").forEach((el) => {
    revealObserver.observe(el);
  });
}

function initCountUp() {
  // Only the three dynamic stat <strong>s animate; data-static ones are skipped.
  const targets = [elements.total, elements.itiTotal, elements.atcTotal].filter(Boolean);
  if (!targets.length) return;

  // Respect reduced motion: leave the final values in place, no animation.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    targets.forEach((el) => el.classList.add("is-counted"));
    return;
  }

  // Capture final values, reset to 0, then animate on visibility.
  const finals = targets.map((el) => {
    const v = parseInt(el.textContent, 10);
    el.textContent = "0";
    el.classList.remove("is-counted");
    return Number.isFinite(v) ? v : 0;
  });

  const panel = document.querySelector(".hero-panel");
  if (!panel) {
    // No panel to observe — just animate immediately.
    animateCountUp(targets, finals);
    return;
  }

  if (!("IntersectionObserver" in window)) {
    // Fallback: set final values, skip animation.
    targets.forEach((el, i) => { el.textContent = String(finals[i]); });
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      if (entries.some((e) => e.isIntersecting)) {
        obs.disconnect();
        animateCountUp(targets, finals);
      }
    },
    { threshold: 0.4 }
  );
  observer.observe(panel);
}

function animateCountUp(targets, finals) {
  const duration = 1100;
  let rafId = 0;
  const start = performance.now();

  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    // ease-out cubic: 1 - (1 - t)^3
    const eased = 1 - Math.pow(1 - t, 3);
    targets.forEach((el, i) => {
      el.textContent = String(Math.round(finals[i] * eased));
    });
    if (t < 1) {
      rafId = requestAnimationFrame(step);
    } else {
      targets.forEach((el, i) => { el.textContent = String(finals[i]); });
      targets.forEach((el) => el.classList.add("is-counted"));
    }
  };

  rafId = requestAnimationFrame(step);
  // Keep a reference in case we ever need to cancel.
  void rafId;
}

function bindEvents() {
  elements.search.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderTrades();
  });

  elements.filters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;

    state.category = button.dataset.category;
    document.querySelectorAll(".filter-tab").forEach((tab) => tab.classList.toggle("active", tab === button));
    renderTrades();
  });

  elements.languageToggle.addEventListener("click", () => {
    state.language = state.language === "en" ? "te" : "en";
    localStorage.setItem("iti-language", state.language);
    updateLanguageUi();
    renderTrades();
  });
}

async function init() {
  updateLanguageUi();
  bindEvents();
  state.trades = await loadTrades();
  renderTrades();
  initCountUp();
}

init();
