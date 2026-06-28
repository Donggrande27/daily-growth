const titleEl = document.querySelector("#resultTitle");
const summaryEl = document.querySelector("#resultSummary");
const resultEl = document.querySelector("#resultText");
const dashboardEl = document.querySelector("#dashboard");
const reflectionForm = document.querySelector("#reflectionForm");
const reflectionText = document.querySelector("#reflectionText");
const buttons = document.querySelectorAll("button");
const weekTitleEl = document.querySelector("#weekTitle");
const weekSummaryEl = document.querySelector("#weekSummary");
const weekTotalEl = document.querySelector("#weekTotal");
const weekOpenEl = document.querySelector("#weekOpen");
const weekCalendarEl = document.querySelector("#weekCalendar");
const weekFocusListEl = document.querySelector("#weekFocusList");

const endpoints = {
  plan: "/api/plan",
  goals: "/api/goals",
  report: "/api/report"
};

for (const button of document.querySelectorAll("[data-action]")) {
  button.addEventListener("click", async () => {
    setActiveAction(button.dataset.action);
    await runAgentAction(button.dataset.action);
  });
}

reflectionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setActiveAction("reflection");
  const text = reflectionText.value.trim();

  if (!text) {
    renderResult({
      title: "회고 입력 필요",
      summary: "저장할 회고 내용을 먼저 입력해주세요.",
      explanation: "예: 오늘 Notion DB를 만들었고 API 연결 준비를 했다. 내일은 배포를 테스트한다."
    });
    return;
  }

  await runRequest("/api/reflection", {
    method: "POST",
    body: JSON.stringify({ text })
  });
  reflectionText.value = "";
  await Promise.all([loadDashboard(), loadWeek()]);
});

async function runAgentAction(action) {
  await runRequest(endpoints[action]);
}

async function runRequest(url, options = {}) {
  setBusy(true);
  renderResult({
    title: "처리 중",
    summary: "Notion 데이터를 확인하고 있습니다.",
    explanation: "잠시만 기다려주세요."
  });

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json"
      },
      ...options
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "요청 처리 중 오류가 발생했습니다.");
    }

    renderResult(data);
  } catch (error) {
    renderResult({
      title: "연결 확인 필요",
      summary: "Notion 연결 또는 환경변수 설정을 확인해야 합니다.",
      explanation: error.message
    });
  } finally {
    setBusy(false);
  }
}

async function loadDashboard() {
  try {
    const response = await fetch("/api/dashboard");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    dashboardEl.innerHTML = `
      <article>
        <span>Goals</span>
        <strong>${data.goals.total}</strong>
      </article>
      <article>
        <span>Open Tasks</span>
        <strong>${data.tasks.open}</strong>
      </article>
      <article>
        <span>Reflections</span>
        <strong>${data.reflections.total}</strong>
      </article>
    `;
  } catch {
    dashboardEl.innerHTML = `
      <article>
        <span>Goals</span>
        <strong>-</strong>
      </article>
      <article>
        <span>Open Tasks</span>
        <strong>-</strong>
      </article>
      <article>
        <span>Reflections</span>
        <strong>-</strong>
      </article>
    `;
  }
}

async function loadWeek() {
  try {
    const response = await fetch("/api/week");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    renderWeek(data);
    renderResult(data);
  } catch (error) {
    weekTitleEl.textContent = "이번 주 캘린더";
    weekSummaryEl.textContent = "Notion 주간 데이터를 불러오지 못했습니다.";
    weekTotalEl.textContent = "-";
    weekOpenEl.textContent = "-";
    weekCalendarEl.innerHTML = `<div class="week-empty">${escapeHtml(error.message)}</div>`;
    weekFocusListEl.innerHTML = "<li>Notion 연결을 확인해주세요.</li>";
  }
}

function renderWeek(data) {
  weekTitleEl.textContent = data.title || "이번 주 실행 캘린더";
  weekSummaryEl.textContent = data.summary || "";
  weekTotalEl.textContent = data.totalTasks ?? "-";
  weekOpenEl.textContent = data.openTasks ?? "-";
  weekCalendarEl.innerHTML = data.days.map(renderDay).join("");

  if (!data.topTasks.length) {
    weekFocusListEl.innerHTML = "<li>이번 주 미완료 작업이 없습니다.</li>";
    return;
  }

  weekFocusListEl.innerHTML = data.topTasks
    .map((task) => {
      const minutes = task.estimatedMinutes ? `${task.estimatedMinutes}분` : "시간 미정";
      return `<li><strong>${escapeHtml(task.name)}</strong><span>${escapeHtml(task.dueDate)} · ${escapeHtml(task.priority || "우선순위 없음")} · ${minutes}</span></li>`;
    })
    .join("");
}

function renderDay(day) {
  const tasks = day.tasks.length
    ? day.tasks.map((task) => `<div class="calendar-task ${task.done ? "done" : ""}" title="${escapeHtml(task.name)}">${escapeHtml(task.name)}</div>`).join("")
    : `<div class="calendar-quiet">비어 있음</div>`;

  return `
    <article class="calendar-day ${day.isToday ? "today" : ""}">
      <header>
        <span>${escapeHtml(day.dayName)}</span>
        <strong>${escapeHtml(day.label)}</strong>
      </header>
      <div class="calendar-items">${tasks}</div>
    </article>
  `;
}

function renderResult(data) {
  titleEl.textContent = data.title || "Agent Output";
  summaryEl.textContent = data.summary || "";
  resultEl.textContent = data.explanation || JSON.stringify(data, null, 2);
}

function setActiveAction(action) {
  for (const button of document.querySelectorAll("[data-action]")) {
    button.classList.toggle("active-action", button.dataset.action === action);
  }

  reflectionForm.classList.toggle("active-form", action === "reflection");
}

function setBusy(isBusy) {
  for (const button of buttons) {
    button.disabled = isBusy;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

Promise.all([loadDashboard(), loadWeek()]);
