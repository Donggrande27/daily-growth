# Notion Daily Growth Agent

Notion 데이터를 읽고 규칙 기반으로 오늘의 계획, 목표 현황, 주간 리포트, 회고 저장을 제공하는 무료 버전 Agent입니다.

## Features

- 오늘 계획 생성: Tasks DB에서 미완료 작업을 읽고 우선순위를 계산합니다.
- 목표 현황 분석: Goals DB의 진행률과 상태를 요약합니다.
- 주간 리포트: Reflections DB에서 최근 회고를 읽고 성과와 다음 행동을 정리합니다.
- 회고 저장: 입력한 내용을 Reflections DB에 새 기록으로 저장합니다.

## Local Setup

1. `.env.example`을 복사해서 `.env.local` 파일을 만듭니다.
2. `NOTION_API_KEY`에 Notion 액세스 토큰을 넣습니다.
3. 아래 명령으로 실행합니다.

```bash
npm run dev
```

4. 브라우저에서 `http://localhost:3000`을 엽니다.

## Vercel Deploy

Vercel에 올린 뒤 Environment Variables에 아래 4개를 등록합니다.

```env
NOTION_API_KEY=secret_xxx
NOTION_GOALS_DB_ID=38d5da5c509280248acfd133632b51bf
NOTION_TASKS_DB_ID=38d5da5c509280fcadceca55d07d8f1f
NOTION_REFLECTIONS_DB_ID=38d5da5c509280efb9dff0246e2f8f56
```

`NOTION_API_KEY`는 절대 GitHub에 올리지 마세요.
