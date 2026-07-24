const yearSelect = document.getElementById("yearSelect");
const inputText = document.getElementById("inputText");
const checkButton = document.getElementById("checkButton");
const clearButton = document.getElementById("clearButton");
const copyButton = document.getElementById("copyButton");
const resultBody = document.getElementById("resultBody");
const errorPanel = document.getElementById("errorPanel");
const summaryTotalLines = document.getElementById("summaryTotalLines");
const summaryTotalEntries = document.getElementById("summaryTotalEntries");
const summaryCorrect = document.getElementById("summaryCorrect");
const summaryMismatch = document.getElementById("summaryMismatch");
const summaryParseErrors = document.getElementById("summaryParseErrors");
const summaryInvalidDates = document.getElementById("summaryInvalidDates");
const summaryHolidays = document.getElementById("summaryHolidays");
const scrollTopButton = document.getElementById("scrollTopButton");
const themeToggleButton = document.getElementById("themeToggleButton");

const WEEKDAY_MAP = {
  0: "日",
  1: "月",
  2: "火",
  3: "水",
  4: "木",
  5: "金",
  6: "土",
};

const VALID_WEEKDAY_CHARS = new Set(["日", "月", "火", "水", "木", "金", "土", "祝"]);

let lastEntries = [];
let lastCopyText = "";

function initializeApp() {
  populateYearOptions();
  checkButton.addEventListener("click", handleCheck);
  clearButton.addEventListener("click", handleClear);
  copyButton.addEventListener("click", handleCopy);
  inputText.addEventListener("keydown", handleTextareaEnter);
  window.addEventListener("scroll", handleScroll);
  scrollTopButton.addEventListener("click", scrollToTop);
  themeToggleButton.addEventListener("click", toggleTheme);
  loadTheme();
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

function handleTextareaEnter(event) {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    handleCheck();
  }
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

function setTheme(theme) {
  if (theme === "dark") {
    document.body.classList.add("dark-mode");
    themeToggleButton.textContent = "☀️";
    themeToggleButton.setAttribute("aria-label", "Chuyển sang chế độ sáng");
  } else {
    document.body.classList.remove("dark-mode");
    themeToggleButton.textContent = "🌙";
    themeToggleButton.setAttribute("aria-label", "Chuyển sang chế độ tối");
  }
  localStorage.setItem("theme", theme);
}

function toggleTheme() {
  const isDark = document.body.classList.contains("dark-mode");
  setTheme(isDark ? "light" : "dark");
}

function loadTheme() {
  const savedTheme = localStorage.getItem("theme");
  const defaultTheme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  setTheme(savedTheme === "dark" || (!savedTheme && defaultTheme === "dark") ? "dark" : "light");
}

function handleCheck() {
  const rawText = inputText.value;
  const selectedYear = Number(yearSelect.value);
  const { parsedItems, totalLines } = parseInput(rawText, selectedYear);
  lastEntries = parsedItems;
  renderResults(parsedItems);
  renderSummary(parsedItems, totalLines);
  renderErrorPanel(parsedItems);
  highlightFirstError(parsedItems, rawText);
}

function handleClear() {
  inputText.value = "";
  resultBody.innerHTML = "";
  errorPanel.innerHTML = "<p class='empty-state'>Không có lỗi. Chưa kiểm tra hoặc dữ liệu hợp lệ.</p>";
  summaryTotalLines.textContent = "0";
  summaryTotalEntries.textContent = "0";
  summaryCorrect.textContent = "0";
  summaryMismatch.textContent = "0";
  summaryParseErrors.textContent = "0";
  summaryInvalidDates.textContent = "0";
  summaryHolidays.textContent = "0";
  resultBody.innerHTML = `
    <tr>
      <td colspan="5" class="empty-state">Chưa có dữ liệu. Hãy chọn năm và dán dữ liệu rồi bấm Kiểm tra.</td>
    </tr>
  `;
  lastEntries = [];
  lastCopyText = "";
  inputText.classList.remove("invalid-highlight");
  scrollTopButton.classList.remove("visible");
}

function handleCopy() {
  if (!lastEntries.length) {
    copyText("Chưa có dữ liệu để copy.");
    return;
  }
  const formatted = formatCopyText(lastEntries);
  lastCopyText = formatted;
  copyText(formatted);
}

function copyText(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      copyButton.textContent = "Đã copy";
      setTimeout(() => {
        copyButton.textContent = "Copy kết quả";
      }, 1400);
    })
    .catch(() => {
      alert("Không thể copy tự động. Hãy thử lại hoặc copy thủ công.");
    });
}

function parseInput(rawText, year) {
  const originalLines = rawText.split(/\r?\n/);
  const normalizedText = normalizeInput(rawText);
  const lines = normalizedText.split("\n");
  const parsedItems = [];
  let currentMonth = null;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    const segments = splitLineSegments(trimmed);
    segments.forEach((segment, segmentIndex) => {
      const monthHeader = extractMonthHeader(segment, segments.length, segmentIndex, segments);
      if (monthHeader && monthHeader.onlyMonth) {
        currentMonth = monthHeader.month;
        return;
      }

      const item = parseSegment(segment, currentMonth, index + 1);
      if (!item) {
        return;
      }

      if (item.isHeaderOnly) {
        currentMonth = item.month;
        return;
      }

      validateItem(item, year);
      parsedItems.push(item);
    });
  });

  return {
    parsedItems,
    totalLines: originalLines.filter((line) => line.trim()).length,
  };
}

function normalizeInput(text) {
  if (!text) {
    return "";
  }

  let normalized = text.replace(/\uFEFF/g, "");
  normalized = normalized.replace(/\r\n?/g, "\n");
  normalized = normalized.normalize("NFKC");
  normalized = normalized.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u00AD\u0600-\u0605\u061C\u06DD\u070F\u17B4\u17B5\u200B-\u200F\u2028-\u202F\u205F-\u206F\uFEFF\uFFFD\uFFFC]/g, "");
  normalized = normalized.replace(/[\uD800-\uDFFF]/g, "");
  normalized = normalized.replace(/[\u2022\u2023\u25E6\u2219\u00B7\uFF65\u2024\uFE19\uFE55\u2043]/g, "・");
  normalized = normalized.replace(/[\u3000\u00A0]/g, " ");
  normalized = normalized.replace(/[\t\f]/g, " ");
  normalized = normalized.replace(/[、,\/\\|•·‧]+/g, "・");
  normalized = normalized.replace(/\s*\n\s*/g, "\n");
  normalized = normalized.replace(/[ \u2000-\u200A]+/g, " ");
  normalized = normalized.replace(/^[ \t\n]+|[ \t\n]+$/g, "");
  return normalized;
}

function splitLineSegments(line) {
  return line
    .split(/[・、,\/\\|•·‧]+/g)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function extractMonthHeader(segment, segmentCount = 1, segmentIndex = 0, segments = []) {
  const monthOnlyMatch = segment.match(/^([1-9]|1[0-2])\s*月$/);
  if (monthOnlyMatch) {
    if (segmentCount === 1) {
      return { onlyMonth: true, month: Number(monthOnlyMatch[1]) };
    }
    if (segmentIndex === 0 && segmentCount > 1) {
      return { onlyMonth: true, month: Number(monthOnlyMatch[1]) };
    }
  }

  const monthPrefixMatch = segment.match(/^(?:\s*)([1-9]|1[0-2])\s*月(?:\s+|$)/);
  if (monthPrefixMatch) {
    const month = Number(monthPrefixMatch[1]);
    const remainder = segment.slice(monthPrefixMatch[0].length).trim();
    if (!remainder) {
      return null;
    }
    return { onlyMonth: false, month, remainder };
  }

  return null;
}

function parseSegment(segment, currentMonth, lineNumber) {
  const originalSegment = segment;
  let month = currentMonth;
  let remainder = segment;

  const monthHeader = extractMonthHeader(segment);
  if (monthHeader && !monthHeader.onlyMonth) {
    month = monthHeader.month;
    remainder = monthHeader.remainder;
  }

  if (!remainder || !remainder.trim()) {
    if (monthHeader && monthHeader.onlyMonth) {
      return { isHeaderOnly: true, month, lineNumber };
    }
    return null;
  }

  remainder = remainder.trim();
  const cleanSegment = remainder.replace(/^[・、,\/\\|]+|[・、,\/\\|]+$/g, "").trim();
  if (!cleanSegment) {
    return null;
  }

  const strictPattern = /^([1-9]|[12][0-9]|3[01])(?:日)?\s*(?:[()（）\[\]「」『』\s]*([日月火水木金土祝])[()（）\[\]「」『』\s]*)?$/u;
  const strictMatch = cleanSegment.match(strictPattern);
  if (strictMatch) {
    const day = Number(strictMatch[1]);
    const rawWeekday = strictMatch[2] || null;
    return {
      lineNumber,
      rawSegment: originalSegment,
      month,
      day,
      rawWeekday,
      hasExplicitWeekday: rawWeekday !== null,
      holiday: rawWeekday === "祝",
      invalidWeekday: false,
    };
  }

  const fallbackMatch = cleanSegment.match(/^([1-9]|[12][0-9]|3[01])(?:日)?\s*([\s\S]+)$/u);
  if (fallbackMatch) {
    const day = Number(fallbackMatch[1]);
    const rawWeekday = fallbackMatch[2].replace(/[()（）\[\]「」『』\s]+/g, "").trim();
    const parsedWeekday = rawWeekday ? rawWeekday[0] : null;
    const recognized = VALID_WEEKDAY_CHARS.has(parsedWeekday);
    return {
      lineNumber,
      rawSegment: originalSegment,
      month,
      day,
      rawWeekday: recognized ? parsedWeekday : rawWeekday || null,
      hasExplicitWeekday: Boolean(rawWeekday),
      holiday: parsedWeekday === "祝",
      invalidWeekday: !recognized && Boolean(rawWeekday),
    };
  }

  const numericOnlyMatch = cleanSegment.match(/^([1-9]|[12][0-9]|3[01])$/);
  if (numericOnlyMatch) {
    return {
      lineNumber,
      rawSegment: originalSegment,
      month,
      day: Number(numericOnlyMatch[1]),
      rawWeekday: null,
      hasExplicitWeekday: false,
      holiday: false,
      invalidWeekday: false,
    };
  }

  return {
    lineNumber,
    rawSegment: originalSegment,
    month,
    day: null,
    rawWeekday: cleanSegment,
    hasExplicitWeekday: false,
    invalidWeekday: true,
    error: true,
    status: "parseError",
    message: "Không nhận diện được định dạng ngày.",
    solution: "Sử dụng định dạng 'DD日(曜)' hoặc 'DD曜' và tách các bản ghi bằng dấu ・, dấu phẩy hoặc xuống dòng.",
  };
}

function validateItem(item, year) {
  if (item.isHeaderOnly) {
    return;
  }

  if (item.error) {
    return;
  }

  item.messages = [];

  if (!item.month) {
    item.status = "missingMonth";
    item.message = "Thiếu tháng. Không có tháng trước đó.";
    item.solution = "Thêm tiêu đề tháng trước dòng này hoặc bắt đầu lại với định dạng 'M月'.";
    item.messages.push(item.message);
    return;
  }

  if (item.month < 1 || item.month > 12) {
    item.status = "invalidMonth";
    item.message = "Tháng không hợp lệ.";
    item.solution = "Kiểm tra lại giá trị tháng (1-12) và đổi sang chữ số thường nếu là ký tự fullwidth.";
    return;
  }

  if (!item.day || item.day < 1 || item.day > 31) {
    item.status = "invalidDay";
    item.message = "Ngày không hợp lệ.";
    item.solution = "Kiểm tra lại số ngày (1-31) và sửa lỗi đánh máy hoặc ký tự sai.";
    return;
  }

  const date = new Date(year, item.month - 1, item.day);
  if (date.getFullYear() !== year || date.getMonth() !== item.month - 1 || date.getDate() !== item.day) {
    item.status = "invalidDate";
    item.message = "Không tồn tại.";
    item.solution = "Chọn năm đúng và kiểm tra lại ngày phù hợp với tháng.";
    return;
  }

  item.actualWeekday = WEEKDAY_MAP[date.getDay()];

  if (item.invalidWeekday) {
    item.status = "invalidWeekday";
    item.message = "Không nhận diện được thứ.";
    item.solution = "Thay thế bằng một trong các ký tự thứ Nhật chuẩn: 日, 月, 火, 水, 木, 金, 土 hoặc xóa thứ nếu chỉ cần kiểm tra ngày.";
    return;
  }

  if (item.holiday) {
    item.status = "holiday";
    item.message = `Ngày lễ (${item.rawWeekday}). Thực tế là ${item.actualWeekday}.`;
    item.solution = "Giữ 祝 nếu đây là ngày lễ hoặc thay bằng thứ Nhật chính xác nếu muốn kiểm tra ngày thường.";
    return;
  }

  if (!item.hasExplicitWeekday) {
    item.status = "noWeekday";
    item.message = `Không có thứ trong file. Thực tế là ${item.actualWeekday}.`;
    item.solution = "Thêm ký tự thứ Nhật sau ngày để so sánh chính xác, ví dụ 15日(月).";
    return;
  }

  if (item.rawWeekday === item.actualWeekday) {
    item.status = "correct";
    item.message = `Đúng.`;
  } else {
    item.status = "mismatch";
    item.message = `Chính xác phải là ${item.actualWeekday}.`;
    item.solution = `Sửa lại ký tự thứ Nhật thành ${item.actualWeekday}.`;
  }
}

function renderResults(items) {
  resultBody.innerHTML = "";
  if (!items.length) {
    resultBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">Chưa có dữ liệu. Hãy chọn năm và dán dữ liệu rồi bấm Kiểm tra.</td>
      </tr>
    `;
    return;
  }

  items.forEach((item) => {
    if (item.isHeaderOnly) {
      return;
    }

    const row = document.createElement("tr");
    row.className = getRowClass(item.status);

    const monthCell = createCell(item.month || "–");
    const dayCell = createCell(item.day || "–");
    const fileCell = createCell(getFileText(item));
    fileCell.className = "status-note";
    const matchCell = createCell(getMatchLabel(item));
    matchCell.className = `status-${item.status === "correct" ? "correct" : item.status === "mismatch" || item.status === "invalidWeekday" || item.status === "invalidDate" || item.status === "invalidMonth" || item.status === "missingMonth" || item.status === "parseError" ? "mismatch" : item.status === "holiday" ? "warning" : "note"}`;
    const resultCell = createCell(getResultText(item));
    resultCell.className = item.status === "correct" ? "status-correct" : item.status === "mismatch" ? "status-mismatch" : item.status === "holiday" || item.status === "invalidWeekday" || item.status === "noWeekday" ? "status-warning" : "status-mismatch";

    row.appendChild(monthCell);
    row.appendChild(dayCell);
    row.appendChild(fileCell);
    row.appendChild(matchCell);
    row.appendChild(resultCell);
    resultBody.appendChild(row);
  });
}

function createCell(content) {
  const cell = document.createElement("td");
  cell.textContent = content;
  return cell;
}

function getRowClass(status) {
  switch (status) {
    case "correct":
      return "correct";
    case "mismatch":
      return "mismatch";
    case "holiday":
      return "holiday-row";
    case "noWeekday":
      return "no-weekday";
    case "invalidWeekday":
    case "invalidDate":
    case "invalidDay":
    case "invalidMonth":
    case "missingMonth":
    case "parseError":
      return "error-row";
    default:
      return "";
  }
}

function getFileText(item) {
  if (item.rawWeekday) {
    return item.rawWeekday;
  }

  if (item.status === "noWeekday") {
    return "–";
  }

  return "–";
}

function getMatchLabel(item) {
  switch (item.status) {
    case "correct":
      return "✅";
    case "mismatch":
      return "❌";
    case "holiday":
      return "🟡";
    case "noWeekday":
      return "ℹ️";
    case "invalidWeekday":
    case "invalidDate":
    case "invalidDay":
    case "invalidMonth":
    case "missingMonth":
    case "parseError":
      return "❌";
    default:
      return "–";
  }
}

function getResultText(item) {
  if (item.status === "correct") {
    return item.actualWeekday;
  }

  if (item.status === "mismatch") {
    return `Chính xác phải là ${item.actualWeekday}`;
  }

  if (item.status === "holiday") {
    return item.message;
  }

  if (item.status === "noWeekday") {
    return item.message;
  }

  if (item.status === "invalidWeekday" || item.status === "invalidDate" || item.status === "invalidDay" || item.status === "invalidMonth" || item.status === "missingMonth" || item.status === "parseError") {
    return item.message;
  }

  return "–";
}

function renderSummary(items, totalLines) {
  const totalEntries = items.filter((item) => !item.isHeaderOnly).length;
  const correctCount = items.filter((item) => item.status === "correct").length;
  const mismatchCount = items.filter((item) => item.status === "mismatch").length;
  const parseErrorCount = items.filter((item) => ["invalidWeekday", "invalidDate", "invalidDay", "invalidMonth", "missingMonth", "parseError"].includes(item.status)).length;
  const invalidDateCount = items.filter((item) => item.status === "invalidDate").length;
  const holidayCount = items.filter((item) => item.status === "holiday").length;

  summaryTotalLines.textContent = String(totalLines);
  summaryTotalEntries.textContent = String(totalEntries);
  summaryCorrect.textContent = String(correctCount);
  summaryMismatch.textContent = String(mismatchCount);
  summaryParseErrors.textContent = String(parseErrorCount);
  summaryInvalidDates.textContent = String(invalidDateCount);
  summaryHolidays.textContent = String(holidayCount);
}

function renderErrorPanel(items) {
  const issues = items.filter((item) => item.status && item.status !== "correct");
  if (!issues.length) {
    errorPanel.innerHTML = "<p class='empty-state'>Không có lỗi. Dữ liệu hợp lệ hoặc chỉ có các ngày hợp lệ.</p>";
    return;
  }

  const list = document.createElement("ul");
  list.className = "error-list";

  issues.forEach((item) => {
    const entry = document.createElement("li");
    const headline = document.createElement("strong");
    headline.textContent = `Dòng ${item.lineNumber} – ${item.rawSegment}`;
    const message = document.createElement("span");
    message.textContent = item.message || "Lỗi không xác định.";
    entry.appendChild(headline);
    entry.appendChild(message);

    if (item.solution) {
      const solution = document.createElement("p");
      solution.className = "solution-text";
      solution.textContent = `Giải pháp: ${item.solution}`;
      entry.appendChild(solution);
    }

    list.appendChild(entry);
  });

  errorPanel.innerHTML = "";
  errorPanel.appendChild(list);
}

function highlightFirstError(items, rawText) {
  const firstError = items.find((item) => ["invalidWeekday", "invalidDate", "invalidDay", "invalidMonth", "missingMonth", "parseError"].includes(item.status));
  if (!firstError) {
    inputText.classList.remove("invalid-highlight");
    return;
  }

  const lineIndex = firstError.lineNumber - 1;
  const lines = rawText.split(/\r?\n/);
  let position = 0;
  for (let i = 0; i < lineIndex && i < lines.length; i += 1) {
    position += lines[i].length + 1;
  }

  const lineValue = lines[lineIndex] || "";
  inputText.classList.add("invalid-highlight");
  inputText.focus();
  inputText.setSelectionRange(position, position + lineValue.length);
}

function formatCopyText(items) {
  const lines = [];

  items.forEach((item) => {
    if (item.isHeaderOnly) {
      return;
    }

    const entryHeader = `${item.status === "correct" ? "✅" : item.status === "mismatch" ? "❌" : item.status === "holiday" ? "🟡" : item.status === "noWeekday" ? "ℹ️" : "⚠️"} ${item.month || "?"}月${item.day || "?"}日`;
    if (item.status === "correct") {
      lines.push(`${entryHeader}(${item.actualWeekday})`);
      return;
    }

    if (item.status === "mismatch") {
      lines.push(`${entryHeader}(${item.rawWeekday || "?"})`);
      lines.push(`Đúng phải là ${item.month || "?"}月${item.day || "?"}日(${item.actualWeekday})`);
      lines.push("----------------");
      return;
    }

    if (item.status === "holiday") {
      lines.push(`${entryHeader}(祝)`);
      lines.push(item.message);
      lines.push("----------------");
      return;
    }

    lines.push(`${entryHeader} - ${item.message}`);
    lines.push("----------------");
  });

  return lines.join("\n");
}

initializeApp();
