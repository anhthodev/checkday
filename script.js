const yearSelect = document.getElementById("yearSelect");
const monthSelect = document.getElementById("monthSelect");
const calendarGrid = document.getElementById("calendarGrid");
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

const selectionRows = [];
let currentSelection = new Set();
let activeRowId = null;
let currentActiveYear = null;
let currentActiveMonth = null;
let nextRowId = 1;
let viewAllMode = false;
let layoutMode = "table";
let hideActions = false;
const viewAllButton = document.getElementById("viewAllButton");
const resetButton = document.getElementById("resetButton");
const clearAllButton = document.getElementById("clearAllButton");
const layoutToggleButton = document.getElementById("layoutToggleButton");
const toggleActionsButton = document.getElementById("toggleActionsButton");
const selectedDaysTableBody = document.getElementById("selectedDaysTableBody");
const selectedDaysTableWrapper = document.getElementById("selectedDaysTableWrapper");
const selectedDaysInline = document.getElementById("selectedDaysInline");
const selectedDaysPanel = document.querySelector(".selected-days-panel");

function getGroupOrder() {
  const groupIds = [];
  selectionRows.forEach((row) => {
    if (!groupIds.includes(row.groupId)) {
      groupIds.push(row.groupId);
    }
  });
  return groupIds;
}

function getGroupDisplayIndex(groupId) {
  const groupOrder = getGroupOrder();
  return groupOrder.indexOf(groupId) + 1;
}

function getNextGroupId() {
  const groupIds = getGroupOrder();
  if (!groupIds.length) {
    return 1;
  }
  return Math.max(...groupIds) + 1;
}

function setRowGroup(rowId, groupId) {
  const row = selectionRows.find((item) => item.id === rowId);
  if (!row) {
    return;
  }
  row.groupId = groupId;
  renderCalendar();
  updateSelectedDaysDisplay();
}

function moveRow(rowId, direction) {
  const currentIndex = selectionRows.findIndex((item) => item.id === rowId);
  const targetIndex = currentIndex + direction;
  if (currentIndex === -1 || targetIndex < 0 || targetIndex >= selectionRows.length) {
    return;
  }
  const [row] = selectionRows.splice(currentIndex, 1);
  selectionRows.splice(targetIndex, 0, row);
  renderCalendar();
  updateSelectedDaysDisplay();
}

function createMoveButton(row, direction, isInline = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = isInline ? "inline-action-button" : "action-button";
  button.textContent = direction === "up" ? "↑" : "↓";
  button.title = direction === "up" ? "Di chuyển lên trên" : "Di chuyển xuống dưới";
  const currentIndex = selectionRows.findIndex((item) => item.id === row.id);
  const isDisabled = direction === "up" ? currentIndex === 0 : currentIndex === selectionRows.length - 1;
  if (isDisabled) {
    button.disabled = true;
  }
  button.addEventListener("click", () => moveRow(row.id, direction === "up" ? -1 : 1));
  return button;
}

function createGroupSelect(row) {
  const select = document.createElement("select");
  select.className = "group-select";
  select.title = "Chọn nhóm hàng";

  const groupOrder = getGroupOrder();
  groupOrder.forEach((groupId) => {
    const option = document.createElement("option");
    option.value = String(groupId);
    option.textContent = `Hàng ${getGroupDisplayIndex(groupId)}`;
    if (groupId === row.groupId) {
      option.selected = true;
    }
    select.appendChild(option);
  });

  const newGroupOption = document.createElement("option");
  newGroupOption.value = "new";
  newGroupOption.textContent = "Hàng mới";
  select.appendChild(newGroupOption);

  select.addEventListener("change", () => {
    if (select.value === "new") {
      setRowGroup(row.id, getNextGroupId());
    } else {
      setRowGroup(row.id, Number(select.value));
    }
  });

  return select;
}

function getDateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return { year, month, day };
}


function initializeApp() {
  populateYearOptions();
  populateMonthOptions();
  currentActiveYear = Number(yearSelect.value);
  currentActiveMonth = Number(monthSelect.value);
  viewAllButton.addEventListener("click", toggleViewAllMode);
  resetButton.addEventListener("click", resetSelection);
  clearAllButton.addEventListener("click", clearAllSelection);
  layoutToggleButton.addEventListener("click", toggleLayoutMode);
  toggleActionsButton.addEventListener("click", toggleActionsVisibility);
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
    const dateKey = getDateKey(selectedYear, selectedMonth, day);
    if (viewAllMode) {
      if (currentSelection.has(dateKey)) {
        button.classList.add("selected");
        button.setAttribute("aria-pressed", "true");
      } else {
        button.setAttribute("aria-pressed", "false");
      }
      button.addEventListener("click", () => toggleSelectedDay(day));
    } else {
      if (currentSelection.has(dateKey)) {
        button.classList.add("selected");
        button.setAttribute("aria-pressed", "true");
      } else {
        button.setAttribute("aria-pressed", "false");
      }
      button.addEventListener("click", () => toggleSelectedDay(day));
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
  currentActiveYear = Number(yearSelect.value);
  currentActiveMonth = Number(monthSelect.value);
  activeRowId = null;
  currentSelection.clear();
  viewAllMode = false;
  viewAllButton.classList.remove("active");
  viewAllButton.textContent = "Chế độ chọn tất cả ngày";
  renderCalendar();
  updateSelectedDaysDisplay();
}

function toggleSelectedDay(day) {
  if (!currentActiveYear || !currentActiveMonth) {
    return;
  }

  const dateKey = getDateKey(currentActiveYear, currentActiveMonth, day);

  if (!activeRowId || !selectionRows.some((row) => row.id === activeRowId && row.year === currentActiveYear && row.month === currentActiveMonth)) {
    const newRowId = nextRowId++;
    activeRowId = newRowId;
    selectionRows.push({ id: newRowId, year: currentActiveYear, month: currentActiveMonth, days: [], groupId: newRowId });
  }

  const row = selectionRows.find((item) => item.id === activeRowId);
  if (!row) {
    return;
  }

  const dayIndex = row.days.indexOf(day);
  if (dayIndex >= 0) {
    row.days.splice(dayIndex, 1);
  } else {
    row.days.push(day);
    row.days.sort((a, b) => a - b);
  }

  if (!row.days.length) {
    const removeIndex = selectionRows.findIndex((item) => item.id === activeRowId);
    if (removeIndex !== -1) {
      selectionRows.splice(removeIndex, 1);
    }
    activeRowId = null;
    currentSelection.clear();
  } else {
    currentSelection = new Set(row.days.map((dayValue) => getDateKey(row.year, row.month, dayValue)));
  }

  renderCalendar();
  updateSelectedDaysDisplay();
}

function startEditingRow(rowId) {
  const row = selectionRows.find((item) => item.id === rowId);
  if (!row) {
    return;
  }

  yearSelect.value = String(row.year);
  monthSelect.value = String(row.month);
  currentActiveYear = row.year;
  currentActiveMonth = row.month;
  activeRowId = row.id;
  currentSelection = new Set(row.days.map((dayValue) => getDateKey(row.year, row.month, dayValue)));
  viewAllMode = false;
  viewAllButton.classList.remove("active");
  viewAllButton.textContent = "Chế độ chọn tất cả ngày";

  renderCalendar();
  updateSelectedDaysDisplay();
}

function toggleViewAllMode() {
  viewAllMode = !viewAllMode;
  if (viewAllMode) {
    viewAllButton.classList.add("active");
    viewAllButton.textContent = "Đang chọn tất cả ngày";

    if (currentActiveYear && currentActiveMonth) {
      const daysInMonth = new Date(currentActiveYear, currentActiveMonth, 0).getDate();
      const allDays = Array.from({ length: daysInMonth }, (_, index) => index + 1);
      const newRowId = nextRowId++;
      activeRowId = newRowId;
      selectionRows.push({ id: newRowId, year: currentActiveYear, month: currentActiveMonth, days: allDays, groupId: newRowId });
      currentSelection = new Set(allDays.map((day) => getDateKey(currentActiveYear, currentActiveMonth, day)));
    }
  } else {
    viewAllButton.classList.remove("active");
    viewAllButton.textContent = "Chế độ chọn tất cả ngày";
    currentSelection.clear();
  }

  renderCalendar();
  updateSelectedDaysDisplay();
}

function toggleLayoutMode() {
  layoutMode = layoutMode === "table" ? "inline" : "table";
  layoutToggleButton.textContent = layoutMode === "table" ? "Dạng dòng" : "Dạng bảng";
  renderCalendar();
  updateSelectedDaysDisplay();
}

function toggleActionsVisibility() {
  hideActions = !hideActions;
  selectedDaysPanel.classList.toggle("hide-actions", hideActions);
  toggleActionsButton.textContent = hideActions ? "Hiện hành động" : "Ẩn hành động";
}

function resetSelection() {
  const selectedYear = Number(yearSelect.value);
  const selectedMonth = Number(monthSelect.value);
  const hasRowsForMonth = selectionRows.some((row) => row.year === selectedYear && row.month === selectedMonth);

  if (!hasRowsForMonth) {
    return;
  }

  const confirmed = window.confirm("Bạn có chắc muốn reset các lựa chọn của tháng hiện tại không?");
  if (!confirmed) {
    return;
  }

  for (let i = selectionRows.length - 1; i >= 0; i -= 1) {
    if (selectionRows[i].year === selectedYear && selectionRows[i].month === selectedMonth) {
      selectionRows.splice(i, 1);
    }
  }

  if (activeRowId) {
    const activeRowStillExists = selectionRows.some((item) => item.id === activeRowId);
    if (!activeRowStillExists) {
      activeRowId = null;
      currentSelection.clear();
    }
  }

  viewAllMode = false;
  viewAllButton.classList.remove("active");
  viewAllButton.textContent = "Chế độ chọn tất cả ngày";
  renderCalendar();
  updateSelectedDaysDisplay();
}

function clearAllSelection() {
  const confirmed = window.confirm("Bạn có chắc muốn xóa tất cả mục đã chọn không?");
  if (!confirmed) {
    return;
  }
  selectionRows.length = 0;
  activeRowId = null;
  currentSelection.clear();
  renderCalendar();
  updateSelectedDaysDisplay();
}

function updateSelectedDaysDisplay() {
  selectedDaysTableBody.innerHTML = "";
  selectedDaysInline.innerHTML = "";

  if (!selectionRows.length) {
    selectedDaysTableWrapper.classList.toggle("hidden", layoutMode === "inline");
    selectedDaysInline.classList.toggle("hidden", layoutMode === "table");

    if (layoutMode === "table") {
      const emptyRow = document.createElement("tr");
      const emptyCell = document.createElement("td");
      emptyCell.colSpan = 3;
      emptyCell.className = "empty-state";
      emptyCell.textContent = "Chưa có ngày nào được chọn.";
      emptyRow.appendChild(emptyCell);
      selectedDaysTableBody.appendChild(emptyRow);
    } else {
      const emptyMessage = document.createElement("div");
      emptyMessage.className = "empty-state inline-empty";
      emptyMessage.textContent = "Chưa có ngày nào được chọn.";
      selectedDaysInline.appendChild(emptyMessage);
    }

    clearAllButton.disabled = true;
    return;
  }

  clearAllButton.disabled = false;
  selectedDaysTableWrapper.classList.toggle("hidden", layoutMode === "inline");
  selectedDaysInline.classList.toggle("hidden", layoutMode === "table");
  selectedDaysPanel.classList.toggle("hide-actions", hideActions);

  const showYear = new Set(selectionRows.map((row) => row.year)).size > 1;

  if (layoutMode === "inline") {
    const inlineContainer = document.createElement("div");
    inlineContainer.className = "selected-months-inline";

    const groupOrder = getGroupOrder();
    groupOrder.forEach((groupId) => {
      const groupRows = selectionRows.filter((row) => row.groupId === groupId);
      const rowGroup = document.createElement("div");
      rowGroup.className = "month-line-group";

      groupRows.forEach((row) => {
        const monthGroup = document.createElement("div");
        monthGroup.className = "selected-month-group";

        const monthLabel = document.createElement("span");
        monthLabel.className = "inline-month-label";
        monthLabel.textContent = showYear ? `${row.year}年${row.month}月` : `${row.month}月`;
        monthGroup.appendChild(monthLabel);

        row.days.forEach((day) => {
          const date = new Date(row.year, row.month - 1, day);
          const weekday = WEEKDAY_MAP[date.getDay()];
          const holidayKey = `${row.month}-${day}`;
          const holidayInfo = getJapaneseHolidays(row.year).get(holidayKey);
          const dayTag = document.createElement("span");
          dayTag.className = "inline-day-tag";
          dayTag.textContent = holidayInfo ? `${day}(${weekday})(祝)` : `${day}(${weekday})`;
          monthGroup.appendChild(dayTag);
        });

        const actionGroup = document.createElement("div");
        actionGroup.className = "inline-action-group";

        const groupSelect = createGroupSelect(row);
        actionGroup.appendChild(groupSelect);

        const moveUpButton = createMoveButton(row, "up", true);
        actionGroup.appendChild(moveUpButton);

        const moveDownButton = createMoveButton(row, "down", true);
        actionGroup.appendChild(moveDownButton);

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "inline-action-button";
        editButton.textContent = "Sửa";
        editButton.addEventListener("click", () => {
          startEditingRow(row.id);
        });
        actionGroup.appendChild(editButton);

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "inline-action-button";
        deleteButton.textContent = "Xóa";
        deleteButton.addEventListener("click", () => {
          const confirmed = window.confirm("Bạn có chắc muốn xóa mục này không?");
          if (!confirmed) {
            return;
          }
          const rowIndex = selectionRows.findIndex((item) => item.id === row.id);
          if (rowIndex !== -1) {
            selectionRows.splice(rowIndex, 1);
          }
          if (activeRowId === row.id) {
            activeRowId = null;
            currentSelection.clear();
          }
          renderCalendar();
          updateSelectedDaysDisplay();
        });
        actionGroup.appendChild(deleteButton);

        monthGroup.appendChild(actionGroup);
        rowGroup.appendChild(monthGroup);
      });

      inlineContainer.appendChild(rowGroup);
    });

    selectedDaysInline.appendChild(inlineContainer);
    return;
  }

  selectionRows.forEach((row) => {
    const rowElement = document.createElement("tr");

    const monthCell = document.createElement("td");
    monthCell.textContent = showYear ? `${row.year}年${row.month}月` : `${row.month}月`;
    rowElement.appendChild(monthCell);

    const dayCell = document.createElement("td");
    const dayStrings = row.days.map((day) => {
      const date = new Date(row.year, row.month - 1, day);
      const weekday = WEEKDAY_MAP[date.getDay()];
      const holidayKey = `${row.month}-${day}`;
      const holidayInfo = getJapaneseHolidays(row.year).get(holidayKey);
      return holidayInfo ? `${day}(${weekday})(祝)` : `${day}(${weekday})`;
    });
    dayCell.textContent = dayStrings.join("  ");
    rowElement.appendChild(dayCell);

    const actionCell = document.createElement("td");
    const groupSelect = createGroupSelect(row);
    actionCell.appendChild(groupSelect);

    const moveUpButton = createMoveButton(row, "up");
    actionCell.appendChild(moveUpButton);

    const moveDownButton = createMoveButton(row, "down");
    actionCell.appendChild(moveDownButton);

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "action-button";
    editButton.textContent = "Sửa";
    editButton.addEventListener("click", () => {
      startEditingRow(row.id);
    });
    actionCell.appendChild(editButton);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "action-button";
    deleteButton.textContent = "Xóa";
    deleteButton.addEventListener("click", () => {
      const confirmed = window.confirm("Bạn có chắc muốn xóa mục này không?");
      if (!confirmed) {
        return;
      }
      const rowIndex = selectionRows.findIndex((item) => item.id === row.id);
      if (rowIndex !== -1) {
        selectionRows.splice(rowIndex, 1);
      }
      if (activeRowId === row.id) {
        activeRowId = null;
        currentSelection.clear();
      }
      renderCalendar();
      updateSelectedDaysDisplay();
    });
    actionCell.appendChild(deleteButton);
    rowElement.appendChild(actionCell);

    selectedDaysTableBody.appendChild(rowElement);
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
