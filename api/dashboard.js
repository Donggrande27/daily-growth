import { handleApi } from "./_http.js";
import { getEnv, goalFromPage, queryDatabase, reflectionFromPage, taskFromPage } from "./_notion.js";
import { isDone } from "./_agent.js";

export default async function handler(req, res) {
  return handleApi(res, async () => {
    const { goalsDbId, tasksDbId, reflectionsDbId } = getEnv();
    const [goalPages, taskPages, reflectionPages] = await Promise.all([
      queryDatabase(goalsDbId),
      queryDatabase(tasksDbId),
      queryDatabase(reflectionsDbId)
    ]);

    const goals = goalPages.map(goalFromPage);
    const tasks = taskPages.map(taskFromPage);
    const reflections = reflectionPages.map(reflectionFromPage);

    return {
      goals: {
        total: goals.length,
        averageProgress: goals.length
          ? Math.round(goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length)
          : 0
      },
      tasks: {
        total: tasks.length,
        open: tasks.filter((task) => !isDone(task.status)).length,
        done: tasks.filter((task) => isDone(task.status)).length
      },
      reflections: {
        total: reflections.length,
        latest: reflections
          .filter((reflection) => reflection.date)
          .sort((a, b) => b.date.localeCompare(a.date))[0]
      }
    };
  });
}
