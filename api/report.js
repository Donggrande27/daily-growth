import { buildWeeklyReport } from "./_agent.js";
import { handleApi } from "./_http.js";
import { getEnv, queryDatabase, reflectionFromPage } from "./_notion.js";

export default async function handler(req, res) {
  return handleApi(res, async () => {
    const { reflectionsDbId } = getEnv();
    const reflections = (await queryDatabase(reflectionsDbId)).map(reflectionFromPage);
    return buildWeeklyReport(reflections);
  });
}
