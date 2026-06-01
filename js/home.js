const FALLBACK_TRADES = [];

const state = {
  trades: [],
  language: localStorage.getItem("iti-language") || "en",
  category: "All",
  query: ""
};

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
}

init();
