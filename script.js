const yearSelect = document.getElementById("yearSelect");
const monthSelect = document.getElementById("monthSelect");
const calendarGrid = document.getElementById("calendarGrid");
const selectedDaysList = document.getElementById("selectedDaysList");
const scrollTopButton = document.getElementById("scrollTopButton");

const WEEKDAY_MAP = {
  0: "日",
  1: "月",
  2: "火",
  3: "水",
  4: "木",
  5: "金",
  6: "土",
};

const selectedDays = new Set();
let viewAllMode = false;
const viewAllButton = document.getElementById("viewAllButton");
const resetButton = document.getElementById("resetButton");

function initializeApp() {
  populateYearOptions();
  populateMonthOptions();
  viewAllButton.addEventListener("click", toggleViewAllMode);
  resetButton.addEventListener("click", resetSelection);
  yearSelect.addEventListener("change", handleMonthChange);
  monthSelect.addEventListener("change", handleMonthChange);
  window.addEventListener("scroll", handleScroll);
  scrollTopButton.addEventListener("click", scrollToTop);
  renderCalendar();
  updateSelectedDaysDisplay();
  handleScroll();
}

function populateYearOptions() {
  const startYear = 2024;
  const endYear = 2040;
  for (let year = startYear; year <= endYear; year += 1) {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = String(year);
    yearSelect.appendChild(option);
  }
  yearSelect.value = String(startYear);
}

function populateMonthOptions() {
  for (let month = 1; month <= 12; month += 1) {
    const option = document.createElement("option");
    option.value = String(month);
    option.textContent = `${month}月`;
    monthSelect.appendChild(option);
  }
  monthSelect.value = "1";
}

function renderCalendar() {
  const selectedYear = Number(yearSelect.value);
  const selectedMonth = Number(monthSelect.value);
  if (!selectedYear || !selectedMonth) {
    calendarGrid.innerHTML = "<p class='empty-state'>Chọn năm và tháng để xem ngày trong tháng.</p>";
    return;
  }

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  calendarGrid.innerHTML = "";
  const holidayMap = getJapaneseHolidays(selectedYear);

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(selectedYear, selectedMonth - 1, day);
    const weekday = WEEKDAY_MAP[date.getDay()];
    const holidayKey = `${selectedMonth}-${day}`;
    const holidayInfo = holidayMap.get(holidayKey);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "day-button";
    button.textContent = String(day);
    button.dataset.day = String(day);
    button.title = holidayInfo ? `${day}日 - lễ` : `${day}日(${weekday})`;
    if (holidayInfo) {
      button.classList.add("holiday");
    }
    if (viewAllMode) {
      button.classList.add("view-all");
      button.disabled = true;
      button.setAttribute("aria-pressed", "false");
    } else {
      if (selectedDays.has(day)) {
        button.classList.add("selected");
        button.setAttribute("aria-pressed", "true");
      } else {
        button.setAttribute("aria-pressed", "false");
      }
      button.addEventListener("click", () => toggleSelectedDay(day, holidayInfo));
    }
    calendarGrid.appendChild(button);
  }
}

function getJapaneseHolidays(year) {
  const holidays = new Map();

  const addHoliday = (month, day, name) => {
    holidays.set(`${month}-${day}`, { name });
  };

  const nthWeekday = (month, dayOfWeek, n) => {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const delta = (dayOfWeek - firstDay + 7) % 7;
    return 1 + delta + 7 * (n - 1);
  };

  const equinox = (base, yearOffset) => Math.floor(base + 0.242194 * (year - yearOffset) - Math.floor((year - yearOffset) / 4));

  addHoliday(1, 1, "元日");
  addHoliday(1, nthWeekday(1, 1, 2), "成人の日");
  addHoliday(2, 11, "建国記念の日");
  if (year >= 2020) addHoliday(2, 23, "天皇誕生日");
  addHoliday(3, equinox(20.8431, 1980), "春分の日");
  addHoliday(4, 29, "昭和の日");
  addHoliday(5, 3, "憲法記念日");
  addHoliday(5, 4, "みどりの日");
  addHoliday(5, 5, "こどもの日");
  addHoliday(7, nthWeekday(7, 1, 3), "海の日");
  addHoliday(8, 11, "山の日");
  addHoliday(9, nthWeekday(9, 1, 3), "敬老の日");
  addHoliday(9, equinox(23.2488, 1980), "秋分の日");
  addHoliday(10, nthWeekday(10, 1, 2), "スポーツの日");
  addHoliday(11, 3, "文化の日");
  addHoliday(11, 23, "勤労感謝の日");

  const substituteHolidays = [];
  for (const [key] of holidays) {
    const [month, day] = key.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    if (date.getDay() === 0) {
      substituteHolidays.push({ month, day });
    }
  }

  substituteHolidays.forEach(({ month, day }) => {
    let substituteDay = day + 1;
    while (holidays.has(`${month}-${substituteDay}`)) {
      substituteDay += 1;
    }
    holidays.set(`${month}-${substituteDay}`, { name: "振替休日" });
  });

  for (let month = 1; month <= 12; month += 1) {
    const daysCount = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysCount; day += 1) {
      const key = `${month}-${day}`;
      if (holidays.has(key)) {
        continue;
      }
      const date = new Date(year, month - 1, day);
      if (date.getDay() === 0) {
        continue;
      }
      const prevDate = new Date(date);
      prevDate.setDate(day - 1);
      const nextDate = new Date(date);
      nextDate.setDate(day + 1);
      const prevKey = `${prevDate.getMonth() + 1}-${prevDate.getDate()}`;
      const nextKey = `${nextDate.getMonth() + 1}-${nextDate.getDate()}`;
      if (holidays.has(prevKey) && holidays.has(nextKey)) {
        holidays.set(key, { name: "国民の休日" });
      }
    }
  }

  return holidays;
}

function handleMonthChange() {
  selectedDays.clear();
  viewAllMode = false;
  viewAllButton.classList.remove("active");
  viewAllButton.textContent = "Xem tất cả ngày";
  renderCalendar();
  updateSelectedDaysDisplay();
}

function toggleSelectedDay(day, holidayInfo) {
  if (selectedDays.has(day)) {
    selectedDays.delete(day);
  } else {
    selectedDays.add(day);
  }
  renderCalendar();
  updateSelectedDaysDisplay();
}

function toggleViewAllMode() {
  viewAllMode = !viewAllMode;
  if (viewAllMode) {
    viewAllButton.classList.add("active");
    viewAllButton.textContent = "Chế độ tất cả ngày";
  } else {
    viewAllButton.classList.remove("active");
    viewAllButton.textContent = "Xem tất cả ngày";
  }
  renderCalendar();
  updateSelectedDaysDisplay();
}

function resetSelection() {
  selectedDays.clear();
  viewAllMode = false;
  viewAllButton.classList.remove("active");
  viewAllButton.textContent = "Xem tất cả ngày";
  renderCalendar();
  updateSelectedDaysDisplay();
}

function updateSelectedDaysDisplay() {
  selectedDaysList.innerHTML = "";
  const selectedYear = Number(yearSelect.value);
  const selectedMonth = Number(monthSelect.value);
  const holidayMap = getJapaneseHolidays(selectedYear);
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

  if (viewAllMode) {
    for (let day = 1; day <= daysInMonth; day += 1) {
      const holidayKey = `${selectedMonth}-${day}`;
      const holidayInfo = holidayMap.get(holidayKey);
      const pill = document.createElement("span");
      pill.className = "selected-day-pill";
      const weekday = WEEKDAY_MAP[new Date(selectedYear, selectedMonth - 1, day).getDay()];
      if (holidayInfo) {
        pill.classList.add("holiday");
        pill.textContent = `${day}日(${weekday})(祝)`;
      } else {
        pill.textContent = `${day}日(${weekday})`;
      }
      selectedDaysList.appendChild(pill);
    }
    return;
  }

  if (!selectedDays.size) {
    selectedDaysList.innerHTML = "<p class='empty-state'>Chưa có ngày nào được chọn.</p>";
    return;
  }

  const selectedDaysArray = Array.from(selectedDays).sort((a, b) => a - b);
  selectedDaysArray.forEach((day) => {
    const holidayKey = `${selectedMonth}-${day}`;
    const holidayInfo = holidayMap.get(holidayKey);
    const pill = document.createElement("span");
    pill.className = "selected-day-pill";
    const weekday = WEEKDAY_MAP[new Date(selectedYear, selectedMonth - 1, day).getDay()];
    if (holidayInfo) {
      pill.classList.add("holiday");
      pill.textContent = `${day}日(${weekday})(祝)`;
    } else {
      pill.textContent = `${day}日(${weekday})`;
    }
    selectedDaysList.appendChild(pill);
  });
}

function handleScroll() {
  if (window.scrollY > 220) {
    scrollTopButton.classList.add("visible");
  } else {
    scrollTopButton.classList.remove("visible");
  }
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}


initializeApp();
