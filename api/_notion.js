const NOTION_VERSION = "2022-06-28";

export function getEnv() {
  const required = [
    "NOTION_API_KEY",
    "NOTION_GOALS_DB_ID",
    "NOTION_TASKS_DB_ID",
    "NOTION_REFLECTIONS_DB_ID"
  ];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    const error = new Error(`Missing environment variables: ${missing.join(", ")}`);
    error.statusCode = 500;
    throw error;
  }

  return {
    notionApiKey: process.env.NOTION_API_KEY,
    goalsDbId: process.env.NOTION_GOALS_DB_ID,
    tasksDbId: process.env.NOTION_TASKS_DB_ID,
    reflectionsDbId: process.env.NOTION_REFLECTIONS_DB_ID
  };
}

async function notionRequest(path, options = {}) {
  const { notionApiKey } = getEnv();
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${notionApiKey}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.message || `Notion API request failed: ${response.status}`;
    const error = new Error(message);
    error.statusCode = response.status;
    throw error;
  }

  return data;
}

export async function queryDatabase(databaseId, body = {}) {
  const pages = [];
  let cursor;

  do {
    const data = await notionRequest(`/databases/${databaseId}/query`, {
      method: "POST",
      body: {
        page_size: 100,
        start_cursor: cursor,
        ...body
      }
    });
    pages.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return pages;
}

export async function retrieveDatabase(databaseId) {
  return notionRequest(`/databases/${databaseId}`);
}

export async function createPage(databaseId, properties) {
  return notionRequest("/pages", {
    method: "POST",
    body: {
      parent: { database_id: databaseId },
      properties
    }
  });
}

function richTextToPlain(items = []) {
  return items.map((item) => item.plain_text || item.text?.content || "").join("");
}

export function propText(page, names) {
  const prop = getProp(page, names);
  if (!prop) return "";

  if (prop.type === "title") return richTextToPlain(prop.title);
  if (prop.type === "rich_text") return richTextToPlain(prop.rich_text);
  if (prop.type === "select") return prop.select?.name || "";
  if (prop.type === "status") return prop.status?.name || "";
  if (prop.type === "date") return prop.date?.start || "";
  if (prop.type === "number") return String(prop.number ?? "");
  if (prop.type === "formula") return formulaToText(prop.formula);
  if (prop.type === "relation") return prop.relation?.map((item) => item.id).join(", ") || "";

  return "";
}

export function propNumber(page, names) {
  const prop = getProp(page, names);
  if (!prop) return 0;
  if (prop.type === "number") return prop.number ?? 0;
  const value = Number(propText(page, names));
  return Number.isFinite(value) ? value : 0;
}

export function propDate(page, names) {
  const prop = getProp(page, names);
  if (prop?.type === "date") return prop.date?.start || "";

  const value = propText(page, names);
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : "";
}

export function getProp(page, names) {
  for (const name of names) {
    if (page.properties?.[name]) return page.properties[name];
  }

  const normalized = Object.entries(page.properties || {}).find(([key]) => {
    return names.some((name) => key.toLowerCase() === name.toLowerCase());
  });

  return normalized?.[1];
}

function formulaToText(formula) {
  if (!formula) return "";
  if (formula.type === "string") return formula.string || "";
  if (formula.type === "number") return String(formula.number ?? "");
  if (formula.type === "boolean") return formula.boolean ? "true" : "false";
  if (formula.type === "date") return formula.date?.start || "";
  return "";
}

export function taskFromPage(page) {
  return {
    id: page.id,
    name: propText(page, ["Task", "Name", "할 일"]),
    relatedGoal: propText(page, ["Related Goal", "관련 목표"]),
    priority: propText(page, ["Priority", "우선순위"]),
    dueDate: propDate(page, ["Due Date", "마감일"]),
    status: propText(page, ["Status", "상태"]),
    estimatedMinutes: propNumber(page, ["Estimated Minutes", "예상 시간"]),
    notes: propText(page, ["Notes", "메모"])
  };
}

export function goalFromPage(page) {
  return {
    id: page.id,
    name: propText(page, ["Goal", "Name", "목표명"]),
    category: propText(page, ["Category", "분야"]),
    startDate: propDate(page, ["Start Date", "시작일"]),
    dueDate: propDate(page, ["Due Date", "마감일"]),
    status: propText(page, ["Status", "상태"]),
    progress: propNumber(page, ["Progress", "진행률"]),
    description: propText(page, ["Description", "목표 설명"])
  };
}

export function reflectionFromPage(page) {
  return {
    id: page.id,
    title: propText(page, ["Title", "Name", "제목"]),
    date: propDate(page, ["Date", "날짜"]),
    whatIDid: propText(page, ["What I Did", "오늘 한 일"]),
    mood: propText(page, ["Mood", "감정"]),
    achievement: propText(page, ["Achievement", "성과"]),
    improvement: propText(page, ["Improvement", "아쉬운 점"]),
    tomorrowPlan: propText(page, ["Tomorrow Plan", "내일 할 일"]),
    aiSummary: propText(page, ["AI Summary", "AI 요약"])
  };
}

export function titleProperty(text) {
  return {
    title: [
      {
        text: { content: text || "Untitled" }
      }
    ]
  };
}

export function richTextProperty(text) {
  return {
    rich_text: [
      {
        text: { content: text || "" }
      }
    ]
  };
}

export function dateProperty(date) {
  return {
    date: {
      start: date
    }
  };
}

export function selectProperty(name) {
  return {
    select: {
      name
    }
  };
}

export function statusProperty(name) {
  return {
    status: {
      name
    }
  };
}

export function propertyForSchema(schemaProp, value) {
  if (!schemaProp) return undefined;
  if (schemaProp.type === "title") return titleProperty(value);
  if (schemaProp.type === "rich_text") return richTextProperty(value);
  if (schemaProp.type === "date") return dateProperty(value);
  if (schemaProp.type === "select") return selectProperty(value || "Good");
  if (schemaProp.type === "status") return statusProperty(value || "Good");
  if (schemaProp.type === "number") return { number: Number(value) || 0 };
  return undefined;
}

export function findSchemaProperty(database, names) {
  for (const name of names) {
    if (database.properties?.[name]) {
      return { name, schema: database.properties[name] };
    }
  }

  const normalized = Object.entries(database.properties || {}).find(([key]) => {
    return names.some((name) => key.toLowerCase() === name.toLowerCase());
  });

  if (!normalized) return undefined;
  return {
    name: normalized[0],
    schema: normalized[1]
  };
}
