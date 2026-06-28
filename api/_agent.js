export function isDone(status = "") {
  const normalized = status.toLowerCase();
  return ["done", "complete", "completed", "완료"].some((word) => normalized.includes(word));
}

export function priorityScore(priority = "") {
  const normalized = priority.toLowerCase();
  if (normalized.includes("high") || normalized.includes("높음")) return 30;
  if (normalized.includes("medium") || normalized.includes("중간")) return 18;
  if (normalized.includes("low") || normalized.includes("낮음")) return 8;
  return 10;
}

export function dueDateScore(dueDate) {
  if (!dueDate) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const daysLeft = Math.round((due - today) / 86400000);

  if (daysLeft < 0) return 40;
  if (daysLeft === 0) return 35;
  if (daysLeft <= 2) return 28;
  if (daysLeft <= 7) return 18;
  return 5;
}

export function scoreTask(task) {
  let score = priorityScore(task.priority) + dueDateScore(task.dueDate);

  if (task.status.toLowerCase().includes("progress") || task.status.includes("진행")) {
    score += 8;
  }

  if (task.estimatedMinutes > 0 && task.estimatedMinutes <= 30) {
    score += 5;
  }

  return score;
}

export function buildTodayPlan(tasks, goals) {
  const activeTasks = tasks
    .filter((task) => !isDone(task.status))
    .map((task) => ({ ...task, score: scoreTask(task) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const goalMap = new Map(goals.map((goal) => [goal.name, goal]));
  const lines = activeTasks.map((task, index) => {
    const goal = goalMap.get(task.relatedGoal);
    const due = task.dueDate ? `마감일은 ${task.dueDate}` : "마감일 정보는 없음";
    const minutes = task.estimatedMinutes ? `예상 ${task.estimatedMinutes}분` : "예상 시간 미정";
    const goalText = goal ? `관련 목표는 "${goal.name}"이며 현재 진행률은 ${goal.progress}%입니다.` : `관련 목표는 "${task.relatedGoal || "미지정"}"입니다.`;
    const reason = reasonForTask(task);

    return `${index + 1}. ${task.name}\n   - ${due}, ${minutes}\n   - ${goalText}\n   - 추천 이유: ${reason}`;
  });

  return {
    title: "오늘의 우선순위",
    summary: activeTasks.length > 0
      ? "Notion의 할 일 데이터를 기준으로 마감일, 우선순위, 진행 상태를 계산했습니다."
      : "현재 추천할 미완료 작업이 없습니다.",
    items: activeTasks,
    explanation: lines.join("\n\n")
  };
}

export function buildGoalReport(goals) {
  const sorted = [...goals].sort((a, b) => a.progress - b.progress);
  const inProgress = sorted.filter((goal) => !isDone(goal.status));
  const focus = inProgress.slice(0, 3);
  const average = goals.length
    ? Math.round(goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length)
    : 0;

  const explanation = [
    `전체 목표 ${goals.length}개의 평균 진행률은 ${average}%입니다.`,
    "",
    "지금 점검하면 좋은 목표:",
    ...focus.map((goal, index) => `${index + 1}. ${goal.name} (${goal.progress}%) - ${goal.category || "분야 미지정"} / ${goal.status || "상태 미지정"}`)
  ].join("\n");

  return {
    title: "목표 현황",
    summary: "진행률이 낮거나 아직 완료되지 않은 목표를 중심으로 점검했습니다.",
    averageProgress: average,
    goals,
    explanation
  };
}

export function buildWeeklyReport(reflections) {
  const recent = [...reflections]
    .filter((reflection) => reflection.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7)
    .reverse();

  const moodCount = new Map();
  for (const reflection of recent) {
    if (!reflection.mood) continue;
    moodCount.set(reflection.mood, (moodCount.get(reflection.mood) || 0) + 1);
  }

  const strongestMood = [...moodCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "기록 없음";
  const achievements = recent.map((item) => item.achievement).filter(Boolean).slice(-3);
  const improvements = recent.map((item) => item.improvement).filter(Boolean).slice(-3);
  const nextPlans = recent.map((item) => item.tomorrowPlan).filter(Boolean).slice(-3);

  const explanation = [
    `최근 ${recent.length}개의 회고를 기준으로 정리했습니다.`,
    `가장 자주 나타난 감정은 "${strongestMood}"입니다.`,
    "",
    "최근 성과:",
    ...formatList(achievements),
    "",
    "반복해서 개선하면 좋은 점:",
    ...formatList(improvements),
    "",
    "다음 행동 제안:",
    ...formatList(nextPlans)
  ].join("\n");

  return {
    title: "주간 성장 리포트",
    summary: "최근 회고에서 성과, 아쉬움, 다음 행동을 추려냈습니다.",
    reflections: recent,
    explanation
  };
}

export function buildReflectionFields(input = "") {
  const today = new Date().toISOString().slice(0, 10);
  const text = input.trim();
  const achievement = extractByKeyword(text, ["완료", "끝", "했다", "성공", "좋"]);
  const improvement = extractByKeyword(text, ["못", "아쉽", "힘들", "미룸", "부족"]);
  const tomorrowPlan = extractByKeyword(text, ["내일", "다음", "해야", "계획"]);

  const summaryParts = [];
  if (achievement) summaryParts.push("성과가 확인된 하루였습니다");
  if (improvement) summaryParts.push("개선할 지점도 함께 기록되었습니다");
  if (tomorrowPlan) summaryParts.push("다음 행동까지 이어졌습니다");

  return {
    title: `${today} reflection`,
    date: today,
    whatIDid: text || "No reflection text",
    mood: inferMood(text),
    achievement: achievement || "오늘의 활동을 기록했습니다.",
    improvement: improvement || "다음 회고에서 더 구체적으로 점검합니다.",
    tomorrowPlan: tomorrowPlan || "가장 중요한 할 일 1개를 먼저 실행합니다.",
    aiSummary: summaryParts.length
      ? summaryParts.join(". ") + "."
      : "짧은 회고를 바탕으로 하루 기록을 저장했습니다."
  };
}

function reasonForTask(task) {
  const reasons = [];
  const priority = task.priority.toLowerCase();

  if (priority.includes("high") || task.priority.includes("높음")) {
    reasons.push("우선순위가 높습니다");
  }

  const dueScore = dueDateScore(task.dueDate);
  if (dueScore >= 35) reasons.push("마감일이 오늘이거나 지났습니다");
  else if (dueScore >= 28) reasons.push("마감일이 가깝습니다");

  if (task.status.toLowerCase().includes("progress") || task.status.includes("진행")) {
    reasons.push("이미 진행 중이라 이어서 처리하기 좋습니다");
  }

  if (task.estimatedMinutes > 0 && task.estimatedMinutes <= 30) {
    reasons.push("짧은 시간 안에 완료할 수 있습니다");
  }

  return reasons.length ? reasons.join(", ") : "현재 미완료 작업 중 실행 가치가 있습니다";
}

function inferMood(text) {
  if (/(좋|만족|성공|완료|뿌듯)/.test(text)) return "Satisfied";
  if (/(힘들|피곤|지침)/.test(text)) return "Tired";
  if (/(불안|걱정|초조)/.test(text)) return "Anxious";
  if (/(아쉽|못|실패)/.test(text)) return "Normal";
  return "Good";
}

function extractByKeyword(text, keywords) {
  const sentences = text
    .split(/[.!?\n。]/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return sentences.find((sentence) => keywords.some((keyword) => sentence.includes(keyword))) || "";
}

function formatList(items) {
  if (items.length === 0) return ["- 아직 충분한 기록이 없습니다."];
  return items.map((item) => `- ${item}`);
}
