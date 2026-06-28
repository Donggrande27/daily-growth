import { buildTodayPlan } from "./_agent.js";
import { handleApi } from "./_http.js";
import { getEnv, goalFromPage, queryDatabase, taskFromPage } from "./_notion.js";

export default async function handler(req, res) {
  return handleApi(res, async () => {
    const { goalsDbId, tasksDbId } = getEnv();
    const [goalPages, taskPages] = await Promise.all([
      queryDatabase(goalsDbId),
      queryDatabase(tasksDbId)
    ]);

    return buildTodayPlan(taskPages.map(taskFromPage), goalPages.map(goalFromPage));
  });
}
