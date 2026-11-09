const YEARS = [2024, 2025, 2026, 2027];
const SESSION_LABELS = {
  FirstPractice: { short: "FP1", cn: "第一次练习赛" },
  SecondPractice: { short: "FP2", cn: "第二次练习赛" },
  ThirdPractice: { short: "FP3", cn: "第三次练习赛" },
  SprintQualifying: { short: "SQ", cn: "冲刺排位赛" },
  Sprint: { short: "SPRINT", cn: "冲刺赛" },
  Qualifying: { short: "Q", cn: "排位赛" },
  Race: { short: "RACE", cn: "正赛" },
};

const RACE_NAME_CN = {
  "Portuguese Grand Prix": "葡萄牙大奖赛",
  "Turkish Grand Prix": "土耳其大奖赛",
  "Australian Grand Prix": "澳大利亚大奖赛",
  "Bahrain Grand Prix": "巴林大奖赛",
  "Saudi Arabian Grand Prix": "沙特阿拉伯大奖赛",
  "Japanese Grand Prix": "日本大奖赛",
  "Chinese Grand Prix": "中国大奖赛",
  "Miami Grand Prix": "迈阿密大奖赛",
  "Emilia Romagna Grand Prix": "艾米利亚-罗马涅大奖赛",
  "Monaco Grand Prix": "摩纳哥大奖赛",
  "Canadian Grand Prix": "加拿大大奖赛",
  "Spanish Grand Prix": "西班牙大奖赛",
  "Barcelona Grand Prix": "巴塞罗那大奖赛",
  "Austrian Grand Prix": "奥地利大奖赛",
  "British Grand Prix": "英国大奖赛",
  "Hungarian Grand Prix": "匈牙利大奖赛",
  "Belgian Grand Prix": "比利时大奖赛",
  "Dutch Grand Prix": "荷兰大奖赛",
  "Italian Grand Prix": "意大利大奖赛",
  "Azerbaijan Grand Prix": "阿塞拜疆大奖赛",
  "Singapore Grand Prix": "新加坡大奖赛",
  "United States Grand Prix": "美国大奖赛",
  "Mexico City Grand Prix": "墨西哥城大奖赛",
  "São Paulo Grand Prix": "圣保罗大奖赛",
  "Brazilian Grand Prix": "巴西大奖赛",
  "Las Vegas Grand Prix": "拉斯维加斯大奖赛",
  "Qatar Grand Prix": "卡塔尔大奖赛",
  "Abu Dhabi Grand Prix": "阿布扎比大奖赛",
};

const COUNTRY_CN = {
  Portugal: "葡萄牙",
  Türkiye: "土耳其",
  Australia: "澳大利亚",
  Bahrain: "巴林",
  "Saudi Arabia": "沙特阿拉伯",
  Japan: "日本",
  China: "中国",
  USA: "美国",
  Italy: "意大利",
  Monaco: "摩纳哥",
  Canada: "加拿大",
  Spain: "西班牙",
  Austria: "奥地利",
  UK: "英国",
  Hungary: "匈牙利",
  Belgium: "比利时",
  Netherlands: "荷兰",
  Azerbaijan: "阿塞拜疆",
  Singapore: "新加坡",
  Mexico: "墨西哥",
  Brazil: "巴西",
  Qatar: "卡塔尔",
  UAE: "阿联酋",
};

const state = {
  season: 2026,
  filter: "all",
  search: "",
  selectedId: "",
  seasons: {},
  deviceTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
};

const els = {
  deviceTimezone: document.querySelector("#deviceTimezone"),
  seasonButtons: document.querySelectorAll("[data-season]"),
  filterButtons: document.querySelectorAll("[data-filter]"),
  searchInput: document.querySelector("#searchInput"),
  raceRoute: document.querySelector("#raceRoute"),
  mobileRaceList: document.querySelector("#mobileRaceList"),
  roundLabel: document.querySelector("#roundLabel"),
  raceName: document.querySelector("#raceName"),
  raceMeta: document.querySelector("#raceMeta"),
  factStrip: document.querySelector("#factStrip"),
  sessionTitle: document.querySelector("#sessionTitle"),
  sessionTable: document.querySelector("#sessionTable"),
  localTimezone: document.querySelector("#localTimezone"),
  myTimezone: document.querySelector("#myTimezone"),
  favoriteButton: document.querySelector("#favoriteButton"),
};

els.deviceTimezone.textContent = readableTimezone(state.deviceTimeZone);
els.myTimezone.textContent = `我的时间 ${readableTimezone(state.deviceTimeZone)}`;

init();

async function init() {
  try {
    const seasons = await Promise.all(
      YEARS.map(async (year) => {
        const response = await fetch(`data/raw/${year}.json`);
        if (!response.ok) throw new Error(`${year} 赛季数据读取失败`);
        const payload = await response.json();
        return [year, normalizeSeason(payload.MRData.RaceTable.Races)];
      })
    );
    state.seasons = Object.fromEntries(seasons);
    state.selectedId = pickDefaultRace(state.seasons[state.season]).id;
    bindEvents();
    render();
  } catch (error) {
    els.raceRoute.innerHTML = `<div class="empty-state">数据加载失败：${error.message}。请通过本地服务器打开本项目。</div>`;
  }
}

function bindEvents() {
  els.seasonButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.season = Number(button.dataset.season);
      state.selectedId = pickDefaultRace(filteredRaces(false)).id;
      render();
    });
  });

  els.filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      const races = filteredRaces(false);
      if (!races.some((race) => race.id === state.selectedId)) {
        state.selectedId = pickDefaultRace(races).id;
      }
      render();
    });
  });

  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    const races = filteredRaces(false);
    if (races.length && !races.some((race) => race.id === state.selectedId)) {
      state.selectedId = races[0].id;
    }
    render();
  });

  els.favoriteButton.addEventListener("click", () => {
    els.favoriteButton.classList.toggle("active");
    els.favoriteButton.textContent = els.favoriteButton.classList.contains("active") ? "已收藏" : "收藏";
  });
}

function normalizeSeason(races) {
  return races.map((race) => {
    const circuitId = race.Circuit.circuitId;
    const meta = window.CIRCUIT_META[circuitId] || { timezone: "UTC" };
    const sessions = race.pending ? race.pending.map(({ type, date }) => ({
      type, date, short: SESSION_LABELS[type].short, label: SESSION_LABELS[type].cn,
    })) : collectSessions(race);
    const starts = sessions.map((session) => new Date(session.utc || session.date + "T12:00:00Z"));
    const weekendStart = new Date(Math.min(...starts));
    const raceStart = new Date(`${race.date}T${race.time || "12:00:00Z"}`);
    const raceEnd = new Date(raceStart.getTime() + 3 * 60 * 60 * 1000);

    return {
      id: `${race.season}-${race.round}`,
      season: Number(race.season),
      round: Number(race.round),
      raceName: race.raceName,
      raceNameCn: RACE_NAME_CN[race.raceName] || race.raceName,
      circuitId,
      circuitName: race.Circuit.circuitName,
      circuitNameCn: meta.cnName || race.Circuit.circuitName,
      locality: race.Circuit.Location.locality,
      country: race.Circuit.Location.country,
      countryCn: COUNTRY_CN[race.Circuit.Location.country] || race.Circuit.Location.country,
      lat: Number(race.Circuit.Location.lat),
      long: Number(race.Circuit.Location.long),
      timezone: meta.timezone,
      facts: meta,
      date: race.date,
      sessions,
      isSprint: sessions.some((session) => session.type === "Sprint"),
      weekendStart,
      raceStart,
      raceEnd,
      sourceUrl: race.url,
    };
  });
}

function collectSessions(race) {
  const sessions = [];
  Object.entries(SESSION_LABELS).forEach(([key, label]) => {
    const source = key === "Race" ? race : race[key];
    if (!source || !source.date || !source.time) return;
    sessions.push({
      type: key,
      short: label.short,
      label: label.cn,
      utc: `${source.date}T${source.time}`,
    });
  });
  return sessions.sort((a, b) => new Date(a.utc) - new Date(b.utc));
}

function render() {
  updateButtonStates();
  const races = filteredRaces();
  const selected = races.find((race) => race.id === state.selectedId) || races[0];
  if (!selected) {
    els.raceRoute.innerHTML = '<div class="empty-state">没有匹配的比赛。</div>';
    els.mobileRaceList.innerHTML = "";
    return;
  }
  state.selectedId = selected.id;
  renderRoute(races);
  renderMobileList(races);
  renderDetail(selected);
}

function updateButtonStates() {
  els.seasonButtons.forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.season) === state.season);
  });
  els.filterButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === state.filter);
  });
}

function filteredRaces(applySearch = true) {
  const races = state.seasons[state.season] || [];
  const now = new Date();
  return races.filter((race) => {
    if (state.filter === "sprint" && !race.isSprint) return false;
    if (state.filter === "upcoming" && race.raceEnd < now) return false;
    if (!applySearch || !state.search) return true;
    const haystack = [
      race.raceName,
      race.raceNameCn,
      race.circuitName,
      race.circuitNameCn,
      race.locality,
      race.country,
      race.countryCn,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(state.search);
  });
}

function pickDefaultRace(races) {
  const now = new Date();
  return (
    races.find((race) => race.weekendStart <= now && race.raceEnd >= now) ||
    races.find((race) => race.raceEnd >= now) ||
    races[races.length - 1] ||
    { id: "" }
  );
}

function renderRoute(races) {
  els.raceRoute.innerHTML = races
    .map((race) => routeNodeTemplate(race))
    .join("");

  els.raceRoute.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedId = button.dataset.id;
      els.favoriteButton.classList.remove("active");
      els.favoriteButton.textContent = "收藏";
      render();
    });
  });
}

function renderMobileList(races) {
  els.mobileRaceList.innerHTML = races.map((race) => compactRaceTemplate(race)).join("");
  els.mobileRaceList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedId = button.dataset.id;
      render();
    });
  });
}

function routeNodeTemplate(race) {
  const selected = race.id === state.selectedId ? "selected" : "";
  const status = raceStatus(race);
  return `
    <button class="race-node ${selected} ${status}" type="button" data-id="${race.id}">
      <span class="round">${race.round}</span>
      <span class="date">${formatRange(race)}</span>
      <strong>${race.locality}</strong>
      <small>${race.countryCn}</small>
      ${race.isSprint ? '<em>SPRINT</em>' : ""}
    </button>
  `;
}

function compactRaceTemplate(race) {
  return `
    <button class="compact-race ${race.id === state.selectedId ? "selected" : ""}" type="button" data-id="${race.id}">
      <span>${String(race.round).padStart(2, "0")}</span>
      <strong>${race.raceNameCn}</strong>
      <small>${formatRange(race)} · ${race.locality}</small>
      ${race.isSprint ? '<em>冲刺</em>' : ""}
    </button>
  `;
}

function renderDetail(race) {
  const cover = document.querySelector("#raceCover");
  cover.src = `assets/circuits/${race.circuitId}-cover.jpg`;
  cover.alt = race.circuitNameCn;
  const layout = document.querySelector("#trackLayout");
  layout.src = `assets/circuits/${race.circuitId}-layout.webp`;
  layout.alt = race.circuitNameCn + "布局图";
  document.querySelector("#layoutLink").href = layout.src;
  els.roundLabel.textContent = `第 ${race.round} 站 ${race.isSprint ? "· SPRINT" : ""}`;
  els.raceName.textContent = race.raceNameCn;
  els.raceMeta.textContent = `${formatRange(race)} · ${race.locality}, ${race.countryCn} · ${race.circuitNameCn}`;
  els.localTimezone.textContent = `赛道时间 ${readableTimezone(race.timezone)}`;
  els.sessionTitle.textContent = `${race.locality} 周末赛程`;

  els.factStrip.innerHTML = [
    ["赛道长度", valueWithUnit(race.facts.lengthKm, "km")],
    ["圈数", race.facts.laps || "TBC"],
    ["比赛距离", valueWithUnit(race.facts.distanceKm, "km")],
    ["首届大奖赛", race.facts.firstGrandPrix || "TBC"],
    ["赛道时区", shortTimezone(race.timezone)],
  ]
    .map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`)
    .join("");

  els.sessionTable.innerHTML = race.sessions
    .map((session) => sessionRowTemplate(session, race.timezone))
    .join("");
}

function sessionRowTemplate(session, circuitTimezone) {
  if (!session.utc) {
    return `<div class="session-row ${session.type === "Race" ? "race-session" : ""}">
      <div class="session-kind"><span>${session.short}</span><strong>${session.label}</strong></div>
      <div class="session-time"><small>当地 ${session.date.slice(5)}</small>时间待定</div>
      <div class="session-time">待公布</div></div>`;
  }
  const local = formatDateTime(session.utc, circuitTimezone);
  const mine = formatDateTime(session.utc, state.deviceTimeZone);
  const dayShift = local.date === mine.date ? "" : '<span class="day-shift">跨日</span>';
  return `
    <div class="session-row ${session.type === "Race" ? "race-session" : ""}">
      <div class="session-kind">
        <span>${session.short}</span>
        <strong>${session.label}</strong>
      </div>
      <div class="session-time">
        <small>${local.weekday} ${local.date}</small>
        <strong>${local.time}</strong>
      </div>
      <div class="session-time">
        <small>${mine.weekday} ${mine.date} ${dayShift}</small>
        <strong>${mine.time}</strong>
      </div>
    </div>
  `;
}

function raceStatus(race) {
  const now = new Date();
  if (race.weekendStart <= now && race.raceEnd >= now) return "live";
  if (race.raceEnd < now) return "done";
  return "next";
}

function formatRange(race) {
  const start = formatDate(race.weekendStart, race.timezone);
  const end = formatDate(race.raceStart, race.timezone);
  if (start.month === end.month) return `${start.month}月${start.day}-${end.day}日`;
  return `${start.month}月${start.day}日-${end.month}月${end.day}日`;
}

function formatDate(date, timezone) {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: timezone,
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  return {
    month: parts.find((part) => part.type === "month").value,
    day: parts.find((part) => part.type === "day").value,
  };
}

function formatDateTime(utc, timezone) {
  const date = new Date(utc);
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    timeZone: timezone,
    weekday: "short",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const value = (type) => parts.find((part) => part.type === type)?.value || "";
  return {
    weekday: value("weekday"),
    date: `${value("month")}/${value("day")}`,
    time: `${value("hour")}:${value("minute")}`,
  };
}

function readableTimezone(timezone) {
  const now = new Date();
  const offset = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "shortOffset",
  })
    .formatToParts(now)
    .find((part) => part.type === "timeZoneName")?.value;
  return `${timezone.replaceAll("_", " ")} ${offset || ""}`.trim();
}

function shortTimezone(timezone) {
  const now = new Date();
  return (
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
    })
      .formatToParts(now)
      .find((part) => part.type === "timeZoneName")?.value || timezone
  );
}

function valueWithUnit(value, unit) {
  if (!value || value === "TBC") return "TBC";
  return `${value}${unit}`;
}
