import { buildReflectionFields } from "./_agent.js";
import { handleApi, readJsonBody } from "./_http.js";
import {
  createPage,
  findSchemaProperty,
  getEnv,
  propertyForSchema,
  retrieveDatabase
} from "./_notion.js";

const FIELD_MAP = [
  { key: "title", names: ["Title", "Name", "제목"] },
  { key: "date", names: ["Date", "날짜"] },
  { key: "whatIDid", names: ["What I Did", "오늘 한 일"] },
  { key: "mood", names: ["Mood", "감정"] },
  { key: "achievement", names: ["Achievement", "성과"] },
  { key: "improvement", names: ["Improvement", "아쉬운 점"] },
  { key: "tomorrowPlan", names: ["Tomorrow Plan", "내일 할 일"] },
  { key: "aiSummary", names: ["AI Summary", "AI 요약"] }
];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  return handleApi(res, async () => {
    const { reflectionsDbId } = getEnv();
    const body = await readJsonBody(req);
    const fields = buildReflectionFields(body.text || "");
    const database = await retrieveDatabase(reflectionsDbId);
    const properties = {};

    for (const field of FIELD_MAP) {
      const match = findSchemaProperty(database, field.names);
      const prop = propertyForSchema(match?.schema, fields[field.key]);
      if (match && prop) properties[match.name] = prop;
    }

    await createPage(reflectionsDbId, properties);

    return {
      title: "회고 저장 완료",
      summary: "입력한 내용을 규칙 기반으로 정리해서 Notion Reflections DB에 저장했습니다.",
      reflection: fields,
      explanation: [
        `오늘 한 일: ${fields.whatIDid}`,
        `감정: ${fields.mood}`,
        `성과: ${fields.achievement}`,
        `개선점: ${fields.improvement}`,
        `다음 계획: ${fields.tomorrowPlan}`,
        `요약: ${fields.aiSummary}`
      ].join("\n")
    };
  });
}
