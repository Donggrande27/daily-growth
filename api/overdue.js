import { isDone, scoreTask } from "./_agent.js";
import { handleApi } from "./_http.js";
import { getEnv, queryDatabase, taskFromPage } from "./_notion.js";

export default async function handler(req, res) {
  return handleApi(res, async () => {
    const { tasksDbId } = getEnv();
    const taskPages = await queryDatabase(tasksDbId);
    const today = todayISO();

    const tasks = taskPages
      .map(taskFromPage)
      .filter((task) => task.dueDate && task.dueDate < today && !isDone(task.status))
      .map((task) => ({
        ...task,
        score: scoreTask(task),
        daysLate: daysBetween(task.dueDate, today)
      }))
      .sort((a, b) => {
        if (a.dueDate !== b.dueDate) return b.dueDate.localeCompare(a.dueDate);
        return b.score - a.score;
      });

    return {
      title: "지난 기한 확인",
      summary: tasks.length
        ? `오늘(${today}) 기준으로 기한이 지난 미완료 작업 ${tasks.length}개를 찾았습니다.`
        : "오늘 기준으로 기한이 지난 미완료 작업은 없습니다.",
      today,
      total: tasks.length,
      tasks,
      explanation: buildExplanation(tasks, today)
    };
  });
}

function buildExplanation(tasks, today) {
  if (tasks.length === 0) {
    return `오늘(${today}) 기준으로 지난 기한의 미완료 작업이 없습니다.\n새로운 작업이 생기면 Notion Tasks의 Due Date와 Status를 기준으로 자동 정리됩니다.`;
  }

  const lines = tasks.slice(0, 10).map((task, index) => {
    const lateText = task.daysLate === 1 ? "1일 지남" : `${task.daysLate}일 지남`;
    const minutes = task.estimatedMinutes ? `${task.estimatedMinutes}분` : "시간 미정";
    const priority = task.priority || "우선순위 없음";
    return `${index + 1}. ${task.name}\n   - 기한: ${task.dueDate} (${lateText})\n   - ${priority} · ${minutes}`;
  });

  return [
    "먼저 정리하면 좋은 지난 기한 작업입니다.",
    "",
    ...lines,
    "",
    "추천: 오래 붙잡기보다 오늘 처리할 1개, 일정을 다시 잡을 1개, 삭제할 1개로 나누면 부담이 줄어듭니다."
  ].join("\n");
}

function todayISO() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function daysBetween(startIso, endIso) {
  const start = new Date(`${startIso}T00:00:00Z`);
  const end = new Date(`${endIso}T00:00:00Z`);
  return Math.max(0, Math.round((end - start) / 86400000));
}
