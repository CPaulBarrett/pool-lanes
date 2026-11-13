// Draws the lane-availability grid from data.json.
// data.json is written by scripts/fetch.py (run every 30 minutes by GitHub Actions).

const TIMEZONE = "Australia/Melbourne";  // the pool's local time, wherever you view from

let data = null;
let currentPool = location.hash.slice(1) || "50m";

// ---- small helpers ---------------------------------------------------------

// Which colour class a number of free lanes gets (see style.css).
function levelClass(free) {
  if (free === null) return "closed";
  if (free === 0) return "l0";
  if (free <= 2) return "l1";
  if (free <= 4) return "l3";
  if (free <= 6) return "l5";
  return "l7";
}

// "06:00" -> "6am", "13:30" -> ":30" (half hours get a short label)
function timeLabel(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  if (m !== 0) return ":" + String(m).padStart(2, "0");
  const suffix = h < 12 ? "am" : "pm";
  return (h % 12 || 12) + suffix;
}

// Today's date ("2026-11-13") and time ("14:05") in Melbourne.
function melbourneNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date()).map(p => [p.type, p.value])
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

// Adds 30 minutes to "HH:MM" (used to find the slot we're currently in).
function plus30(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + 30;
  return String(Math.floor(total / 60)).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0");
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// ---- drawing ---------------------------------------------------------------

function drawPicker() {
  const nav = document.getElementById("pool-picker");
  nav.replaceChildren();
  for (const pool of data.pools) {
    const button = el("button", "", pool.key);
    button.setAttribute("aria-pressed", pool.key === currentPool);
    button.title = pool.name;
    button.onclick = () => {
      currentPool = pool.key;
      history.replaceState(null, "", "#" + pool.key);  // so the link remembers the pool
      drawPicker();
      drawGrid();
    };
    nav.append(button);
  }
}

function drawGrid() {
  const grid = document.getElementById("grid");
  const pool = data.pools.find(p => p.key === currentPool) || data.pools[0];
  currentPool = pool.key;
  const now = melbourneNow();

  // All the half-hour start times that appear on any day, in order.
  const times = [...new Set(pool.days.flatMap(d => Object.keys(d.slots)))].sort();

  grid.style.setProperty("--days", pool.days.length);
  grid.replaceChildren();

  // Header row: blank corner, then one heading per day.
  grid.append(el("div", "day-head"));
  for (const day of pool.days) {
    const date = new Date(day.date + "T12:00:00");
    const head = el("div", "day-head" + (day.date === now.date ? " today" : ""));
    head.append(
      el("span", "", day.date === now.date ? "Today" : date.toLocaleDateString("en-AU", { weekday: "short" })),
      el("b", "", date.getDate()),
    );
    grid.append(head);
  }

  // One row per time slot.
  for (const time of times) {
    grid.append(el("div", "time" + (time.endsWith(":00") ? " hour" : ""), timeLabel(time)));

    for (const day of pool.days) {
      const free = day.slots[time];  // a number, null (no public lanes), or undefined (not listed)
      const value = free === undefined ? null : free;
      const cell = el("div", "cell " + levelClass(value), value === null ? "–" : value);
      cell.title = `${day.date} ${time}: ` + (value === null ? "no public lanes" : `${value} of ${pool.lanes} lanes free`);

      if (day.date === now.date) {
        if (plus30(time) <= now.time) cell.classList.add("past");
        else if (time <= now.time) cell.classList.add("now");
      }
      grid.append(cell);
    }
  }
}

function drawUpdated() {
  const updated = new Date(data.updated);
  const minutes = Math.round((Date.now() - updated) / 60000);
  const clock = updated.toLocaleTimeString("en-AU", { timeZone: TIMEZONE, hour: "numeric", minute: "2-digit" });
  const ago = minutes < 1 ? "just now" : minutes < 120 ? `${minutes} min ago` : `${Math.round(minutes / 60)} hours ago`;
  document.getElementById("updated").textContent = `Updated ${clock} Melbourne time (${ago}).`;
}

// ---- start -----------------------------------------------------------------

async function load() {
  try {
    // "no-cache" makes the browser check for a fresh copy each time.
    const response = await fetch("data.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(response.status);
    data = await response.json();
    drawPicker();
    drawGrid();
    drawUpdated();
  } catch (error) {
    console.error(error);
    if (data) return;  // keep showing what we already have
    document.getElementById("grid").replaceChildren(
      el("p", "message", "Couldn't load the timetable. Try again in a minute.")
    );
  }
}

load();
// Refresh the "past/now" shading and the "min ago" text every minute.
setInterval(() => { if (data) { drawGrid(); drawUpdated(); } }, 60000);

// When the app comes back to the foreground (e.g. reopened from the home
// screen), fetch fresh data rather than showing what was loaded hours ago.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") load();
});

// Register the service worker (sw.js), which lets the app open offline.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(error => console.error("Service worker:", error));
}
