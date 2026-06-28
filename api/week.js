import { isDone, scoreTask } from "./_agent.js";
import { handleApi } from "./_http.js";
import { getEnv, goalFromPage, queryDatabase, taskFromPage } from "./_notion.js";

const dayNames = ["월", "화", "수", "목", "금", "토", "일"];

export default async function handler(req, res) {
  return handleApi(res, async () => {
    const { goalsDbId, tasksDbId } = getEnv();
    const [goalPages, taskPages] = await Promise.all([
      queryDatabase(goalsDbId),
      queryDatabase(tasksDbId)
    ]);

    const goals = goalPages.map(goalFromPage);
    const tasks = taskPages.map(taskFromPage);
    const goalMap = new Map(goals.map((goal) => [goal.name, goal]));
    const today = new Date();
    const weekStart = startOfWeek(today);
    const weekEnd = addDays(weekStart, 6);
    const startIso = toISODate(weekStart);
    const endIso = toISODate(weekEnd);

    const tasksThisWeek = tasks
      .filter((task) => task.dueDate >= startIso && task.dueDate <= endIso)
      .map((task) => ({
        ...task,
        score: scoreTask(task),
        done: isDone(task.status),
        goalProgress: goalMap.get(task.relatedGoal)?.progress ?? null
      }))
      .sort((a, b) => {
        if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        return b.score - a.score;
      });

    const days = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(weekStart, index);
      const iso = toISODate(date);
      return {
        date: iso,
        dayName: dayNames[index],
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        isToday: iso === toISODate(today),
        tasks: tasksThisWeek.filter((task) => task.dueDate === iso)
      };
    });

    const openTasks = tasksThisWeek.filter((task) => !task.done);
    const topTasks = [...openTasks].sort((a, b) => b.score - a.score).slice(0, 5);

    return {
      title: "이번 주 실행 캘린더",
      summary: `${startIso}부터 ${endIso}까지의 Notion Tasks를 Due Date 기준으로 정리했습니다.`,
      weekStart: startIso,
      weekEnd: endIso,
      totalTasks: tasksThisWeek.length,
      openTasks: openTasks.length,
      days,
      topTasks,
      explanation: buildExplanation(topTasks, openTasks.length, startIso, endIso)
    };
  });
}

function buildExplanation(topTasks, openCount, startIso, endIso) {
  if (topTasks.length === 0) {
    return `이번 주(${startIso} ~ ${endIso})에 예정된 미완료 작업이 없습니다. Notion Tasks에서 Due Date를 추가하면 여기에 자동으로 표시됩니다.`;
  }

  const lines = topTasks.map((task, index) => {
    const minutes = task.estimatedMinutes ? `${task.estimatedMinutes}분` : "시간 미정";
    const goal = task.relatedGoal ? ` / 목표: ${task.relatedGoal}` : "";
    return `${index + 1}. ${task.name} (${task.dueDate}, ${minutes})${goal}`;
  });

  return [
    `이번 주(${startIso} ~ ${endIso})에는 미완료 작업 ${openCount}개가 있습니다.`,
    "먼저 보면 좋은 일:",
    ...lines
  ].join("\n");
}

function startOfWeek(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function toISODate(date) {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 10);
}
