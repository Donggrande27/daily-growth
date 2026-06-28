import { buildGoalReport } from "./_agent.js";
import { handleApi } from "./_http.js";
import { getEnv, goalFromPage, queryDatabase } from "./_notion.js";

export default async function handler(req, res) {
  return handleApi(res, async () => {
    const { goalsDbId } = getEnv();
    const goals = (await queryDatabase(goalsDbId)).map(goalFromPage);
    return buildGoalReport(goals);
  });
}
