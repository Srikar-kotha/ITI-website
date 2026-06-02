const state = {
  trades: [],
  language: localStorage.getItem("iti-language") || "en"
};

const detail = document.getElementById("tradeDetail");
const languageToggle = document.getElementById("languageToggle");

async function loadTrades() {
  try {
    const response = await fetch("data/trades.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Unable to load trades.json");
    }
    return await response.json();
  } catch (error) {
    console.warn("Using built-in fallback data because JSON could not be loaded.", error);
    return window.TRADES_FALLBACK || [];
  }
}

function text(trade, key) {
  return trade[`${key}_${state.language}`] || trade[`${key}_en`] || "";
}

function list(trade, key) {
  return trade[`${key}_${state.language}`] || trade[`${key}_en`] || [];
}

function sectionList(trade, key) {
  return trade[`${key}_sections_${state.language}`] || trade[`${key}_sections_en`] || [];
}

function label(en, te) {
  return state.language === "te" ? te : en;
}

function renderList(items) {
  return `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

function renderSectionGroups(sections, fallbackItems) {
  if (!sections.length) {
    return renderList(fallbackItems);
  }

  return sections.map((section) => `
    <div class="section-group">
      <h3>${section.heading}</h3>
      ${renderList(section.items || [])}
    </div>
  `).join("");
}

function itemText(item, key) {
  return item[`${key}_${state.language}`] || item[`${key}_en`] || "";
}

function pdfLinks(trade) {
  if (Array.isArray(trade.pdf_links) && trade.pdf_links.length) {
    return trade.pdf_links;
  }

  return [
    {
      title_en: "Download Trade Theory",
      title_te: "ట్రేడ్ థియరీ డౌన్లోడ్",
      href: trade.pdfs.theory,
      note_en: "Open study material PDF",
      note_te: "అధ్యయన PDF తెరవండి"
    },
    {
      title_en: "Download Practical Manual",
      title_te: "ప్రాక్టికల్ మాన్యువల్ డౌన్లోడ్",
      href: trade.pdfs.practical,
      note_en: "Open workshop manual PDF",
      note_te: "వర్క్ షాప్ మాన్యువల్ PDF తెరవండి"
    }
  ];
}

function renderPdfCards(trade) {
  return pdfLinks(trade).map((pdf) => `
    <a class="pdf-card" href="${pdf.href}" target="_blank" rel="noreferrer">
      <span class="pdf-icon" aria-hidden="true">📘</span>
      <strong>${itemText(pdf, "title")}</strong>
      <span>${itemText(pdf, "note")}</span>
    </a>
  `).join("");
}

function getCurrentTrade() {
  const id = new URLSearchParams(window.location.search).get("id") || state.trades[0]?.id;
  return state.trades.find((trade) => trade.id === id);
}

function renderNotFound() {
  detail.innerHTML = `
    <section class="not-found">
      <h1>${label("Trade not found", "ట్రేడ్ కనిపించలేదు")}</h1>
      <p>${label("Please return to the home page and choose a valid trade.", "దయచేసి హోమ్ పేజీకి వెళ్లి సరైన ట్రేడ్ ఎంచుకోండి.")}</p>
      <a class="button primary" href="index.html">${label("Home", "హోమ్")}</a>
    </section>
  `;
}

function renderTrade() {
  const trade = getCurrentTrade();
  if (!trade) {
    renderNotFound();
    return;
  }

  const index = state.trades.findIndex((item) => item.id === trade.id);
  const next = state.trades[(index + 1) % state.trades.length];

  document.title = `${text(trade, "name")} | ITI Trades Portal`;
  document.documentElement.lang = state.language === "te" ? "te" : "en";
  languageToggle.textContent = state.language === "te" ? "English" : "తెలుగు";

  detail.innerHTML = `
    <section class="detail-hero">
      <span class="eyebrow">${trade.category}</span>
      <h1>${text(trade, "name")}</h1>
      <p>${text(trade, "description")}</p>
      <div class="detail-actions">
        <a class="button" href="index.html">${label("Home", "హోమ్")}</a>
        <button class="button" type="button" id="backButton">${label("Back", "వెనుకకు")}</button>
        <a class="button primary" href="trade.html?id=${encodeURIComponent(next.id)}">${label("Next Trade", "తదుపరి ట్రేడ్")}</a>
      </div>
    </section>

    <section class="detail-card full-width">
      <div class="info-strip">
        <div class="info-item">
          <span>${label("Duration", "వ్యవధి")}</span>
          <strong>${text(trade, "duration")}</strong>
        </div>
        <div class="info-item">
          <span>${label("Eligibility", "అర్హత")}</span>
          <strong>${text(trade, "eligibility")}</strong>
        </div>
        <div class="info-item">
          <span>${label("Salary Range", "జీతం పరిధి")}</span>
          <strong>${text(trade, "salary")}</strong>
        </div>
      </div>
    </section>

    <div class="detail-layout">
      <section class="detail-card">
        <h2>${label("Curriculum", "పాఠ్యాంశాలు")}</h2>
        ${renderSectionGroups(sectionList(trade, "curriculum"), list(trade, "curriculum"))}
      </section>
      <section class="detail-card">
        <h2>${label("Apprenticeship Opportunities", "అప్రెంటిస్ అవకాశాలు")}</h2>
        ${renderSectionGroups(sectionList(trade, "apprenticeship"), list(trade, "apprenticeship"))}
      </section>
      <section class="detail-card">
        <h2>${label("Job Opportunities", "ఉద్యోగ అవకాశాలు")}</h2>
        ${renderSectionGroups(sectionList(trade, "job"), list(trade, "jobs"))}
      </section>
      <section class="detail-card">
        <h2>${label("PDF Downloads", "PDF డౌన్లోడ్లు")}</h2>
        <div class="pdf-grid">
          ${renderPdfCards(trade)}
        </div>
      </section>
    </div>
  `;

  document.getElementById("backButton").addEventListener("click", () => {
    if (history.length > 1) {
      history.back();
    } else {
      window.location.href = "index.html";
    }
  });
}

languageToggle.addEventListener("click", () => {
  state.language = state.language === "en" ? "te" : "en";
  localStorage.setItem("iti-language", state.language);
  renderTrade();
});

async function init() {
  languageToggle.textContent = state.language === "te" ? "English" : "తెలుగు";
  state.trades = await loadTrades();
  renderTrade();
}

init();
