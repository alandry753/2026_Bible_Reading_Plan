// Enhanced mobile-first reader
const BG_BASE = "https://www.biblegateway.com/passage/?search=";

function encPassage(p) {
  if (!p) return "";
  const normalized = String(p).replace(/–/g, "-").trim();
  return encodeURIComponent(normalized).replace(/%20/g, "+");
}

function linkFor(passage, version) {
  return BG_BASE + encPassage(passage) + "&version=" + encodeURIComponent(version);
}

let plan = [];
let idx = 1;

// UI
const cardWrap = document.getElementById("cardWrap");
const monthWrap = document.getElementById("monthWrap");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const todayBtn = document.getElementById("todayBtn");
const datePicker = document.getElementById("datePicker");
const dayToggle = document.getElementById("dayToggle");

const versionSelect = document.getElementById("versionSelect");
const tanakhJpsToggle = document.getElementById("tanakhJpsToggle");

const searchBox = document.getElementById("searchBox");
const searchPrevBtn = document.getElementById("searchPrevBtn");
const searchNextBtn = document.getElementById("searchNextBtn");

const dayModeBtn = document.getElementById("dayModeBtn");
const monthModeBtn = document.getElementById("monthModeBtn");

const monthTitle = document.getElementById("monthTitle");
const monthPrevBtn = document.getElementById("monthPrevBtn");
const monthNextBtn = document.getElementById("monthNextBtn");
const dowRow = document.getElementById("dowRow");
const monthGrid = document.getElementById("monthGrid");

const DOWS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

let matches = [];
let matchPos = -1;

function setIdx(newIdx) {
  idx = Math.max(1, Math.min(plan.length, newIdx));
  render();
  syncUrl();
}

function syncUrl() {
  const url = new URL(window.location);
  url.searchParams.set("d", String(idx));
  url.searchParams.set("v", versionSelect.value);
  url.searchParams.set("tj", tanakhJpsToggle.checked ? "1" : "0");
  window.history.replaceState({}, "", url);
}

function readUrlState() {
  const url = new URL(window.location);
  const d = parseInt(url.searchParams.get("d") || "", 10);
  if (Number.isFinite(d) && d >= 1 && d <= plan.length) idx = d;

  const v = url.searchParams.get("v");
  if (v) versionSelect.value = v;

  tanakhJpsToggle.checked = (url.searchParams.get("tj") === "1");
}

function findIdxByIso(iso) {
  const i = plan.findIndex(x => x.isoDate === iso);
  return i >= 0 ? (i + 1) : null;
}

function section(label, bodyHtml, subHtml="") {
  return `
    <div class="section">
      <div class="label">${label}</div>
      <div class="value">${bodyHtml || "<span class='sub'>—</span>"}</div>
      ${subHtml ? `<div class="sub">${subHtml}</div>` : ""}
    </div>`;
}

function renderDayCard() {
  const d = plan[idx - 1];
  if (!d) return;

  prevBtn.disabled = idx <= 1;
  nextBtn.disabled = idx >= plan.length;

  datePicker.value = d.isoDate;

  const showDay = dayToggle.checked;
  const dayNumHtml = showDay ? `<span class="daynum">Day ${d.idx}</span>` : "";

  const vDefault = versionSelect.value;
  const vTanakh = tanakhJpsToggle.checked ? "JPS" : vDefault;

  const torahHtml = d.torahRef ? `<a href="${linkFor(d.torahRef, vDefault)}" target="_blank" rel="noreferrer">${d.torahRef}</a>` : "";
  const tanakhHtml = d.tanakhRef ? `<a href="${linkFor(d.tanakhRef, vTanakh)}" target="_blank" rel="noreferrer">${d.tanakhRef}</a>` : "";
  const ntHtml = d.ntRef ? `<a href="${linkFor(d.ntRef, vDefault)}" target="_blank" rel="noreferrer">${d.ntRef}</a>` : "";

  let psHtml = "";
  if (Array.isArray(d.psalmsRef) && d.psalmsRef.length) {
    psHtml = d.psalmsRef.map(p => `<div><a href="${linkFor(p, vDefault)}" target="_blank" rel="noreferrer">${p}</a></div>`).join("");
  }

  const proHtml = d.proverbsRef ? `<a href="${linkFor(d.proverbsRef, vDefault)}" target="_blank" rel="noreferrer">${d.proverbsRef}</a>` : "";

  cardWrap.innerHTML = `
    <div class="date">
      <span>${d.dateLabel}</span>
      ${dayNumHtml}
    </div>
    ${section("Torah", torahHtml, d.torahName ? d.torahName : "")}
    ${section("Tanakh", tanakhHtml)}
    ${section("New Testament", ntHtml)}
    ${section("Psalms", psHtml)}
    ${section("Proverbs", proHtml)}
    ${matches.length ? `<div class="notice">Search: ${matches.length} match(es). You are on #${matchPos+1}.</div>` : ""}
  `;
}

function setMode(mode) {
  if (mode === "month") {
    dayModeBtn.classList.remove("active");
    monthModeBtn.classList.add("active");
    cardWrap.style.display = "none";
    monthWrap.style.display = "block";
    renderMonthView();
  } else {
    monthModeBtn.classList.remove("active");
    dayModeBtn.classList.add("active");
    monthWrap.style.display = "none";
    cardWrap.style.display = "block";
    renderDayCard();
  }
}

function render() {
  if (monthWrap.style.display === "block") renderMonthView();
  else renderDayCard();
}

function monthKeyFromIso(iso) {
  return iso.slice(0,7);
}

function parseIso(iso) {
  const [y,m,d] = iso.split("-").map(n => parseInt(n,10));
  return new Date(y, m-1, d);
}

let monthKey = "2026-01";

function renderMonthView() {
  const d = plan[idx-1];
  if (d) monthKey = monthKeyFromIso(d.isoDate);

  const dt = parseIso(monthKey + "-01");
  const y = dt.getFullYear();
  const m = dt.getMonth();

  monthTitle.textContent = `${MONTHS[m]} ${y}`;

  dowRow.innerHTML = DOWS.map(x => `<div class="dow">${x}</div>`).join("");

  const first = new Date(y, m, 1);
  const last = new Date(y, m+1, 0);
  const startOffset = first.getDay();
  const totalDays = last.getDate();

  const cells = [];
  for (let i=0; i<startOffset; i++) cells.push({ blank:true });
  for (let day=1; day<=totalDays; day++) {
    const iso = new Date(y, m, day).toISOString().slice(0,10);
    const di = findIdxByIso(iso);
    if (di) cells.push({ blank:false, iso, idx:di, day });
    else cells.push({ blank:false, iso, idx:null, day });
  }
  while (cells.length % 7 !== 0) cells.push({ blank:true });

  monthGrid.innerHTML = cells.map(c => {
    if (c.blank) return `<div></div>`;
    if (!c.idx) return `<div class="daycell" style="opacity:.35"><div class="n">${c.day}</div><div class="d">—</div></div>`;
    const dObj = plan[c.idx-1];
    return `<div class="daycell" data-idx="${c.idx}"><div class="n">${c.day}</div><div class="d">${dObj.dayOfWeek}</div></div>`;
  }).join("");

  const firstIso = plan[0].isoDate;
  const lastIso = plan[plan.length-1].isoDate;
  const prevMonth = new Date(y, m-1, 1).toISOString().slice(0,7);
  const nextMonth = new Date(y, m+1, 1).toISOString().slice(0,7);
  monthPrevBtn.disabled = (prevMonth < firstIso.slice(0,7));
  monthNextBtn.disabled = (nextMonth > lastIso.slice(0,7));
}

function jumpMonth(delta) {
  const dt = parseIso(monthKey + "-01");
  dt.setMonth(dt.getMonth() + delta);
  monthKey = dt.toISOString().slice(0,7);
  const i = plan.findIndex(x => x.isoDate.startsWith(monthKey));
  if (i >= 0) idx = i+1;
  renderMonthView();
  syncUrl();
}

function normalize(s){ return String(s||"").toLowerCase(); }

function computeMatches(q) {
  const query = normalize(q).trim();
  if (!query) { matches = []; matchPos = -1; return; }
  matches = [];
  for (let i=0; i<plan.length; i++) {
    const d = plan[i];
    const hay = [
      d.torahRef, d.torahName, d.tanakhRef, d.ntRef, d.proverbsRef,
      Array.isArray(d.psalmsRef) ? d.psalmsRef.join(" ; ") : ""
    ].map(normalize).join(" | ");
    if (hay.includes(query)) matches.push(i+1);
  }
  matchPos = matches.length ? 0 : -1;
}

function gotoMatch(pos) {
  if (!matches.length) return;
  matchPos = (pos + matches.length) % matches.length;
  setIdx(matches[matchPos]);
}

prevBtn.addEventListener("click", () => setIdx(idx - 1));
nextBtn.addEventListener("click", () => setIdx(idx + 1));
todayBtn.addEventListener("click", () => {
  const todayIso = new Date().toISOString().slice(0,10);
  const found = findIdxByIso(todayIso);
  setIdx(found || 1);
});
datePicker.addEventListener("change", (e) => {
  const iso = e.target.value;
  const found = findIdxByIso(iso);
  if (found) setIdx(found);
});
dayToggle.addEventListener("change", () => { renderDayCard(); syncUrl(); });

versionSelect.addEventListener("change", () => { render(); syncUrl(); });
tanakhJpsToggle.addEventListener("change", () => { render(); syncUrl(); });

searchBox.addEventListener("input", () => {
  computeMatches(searchBox.value);
  if (matches.length) gotoMatch(0);
  else { render(); syncUrl(); }
});
searchPrevBtn.addEventListener("click", () => gotoMatch(matchPos-1));
searchNextBtn.addEventListener("click", () => gotoMatch(matchPos+1));

dayModeBtn.addEventListener("click", () => setMode("day"));
monthModeBtn.addEventListener("click", () => setMode("month"));

monthPrevBtn.addEventListener("click", () => jumpMonth(-1));
monthNextBtn.addEventListener("click", () => jumpMonth(1));
monthGrid.addEventListener("click", (e) => {
  const cell = e.target.closest(".daycell");
  if (!cell) return;
  const di = parseInt(cell.getAttribute("data-idx") || "", 10);
  if (Number.isFinite(di)) { setIdx(di); setMode("day"); }
});

async function init() {
  try {
    const res = await fetch("reading_plan_2026.json", { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status + " while loading reading_plan_2026.json");
    plan = await res.json();

    readUrlState();

    const url = new URL(window.location);
    if (!url.searchParams.get("d")) {
      const todayIso = new Date().toISOString().slice(0,10);
      const found = findIdxByIso(todayIso);
      if (found) idx = found;
    }

    monthKey = monthKeyFromIso(plan[idx-1].isoDate);

    setMode("day");
    syncUrl();
  } catch (err) {
    cardWrap.innerHTML = `<div class="date">Could not load reading plan</div>
      <div class="notice">
        <div><b>Error:</b> ${String(err)}</div>
        <div style="margin-top:8px">Open the site via <code>http://localhost:8000</code> and confirm these files are together:</div>
        <div style="margin-top:6px"><code>index.html</code>, <code>app.js</code>, <code>reading_plan_2026.json</code></div>
      </div>`;
  }
}

init();
