# 설정 방법

## 1. `.env.local` 만들기

프로젝트 폴더 안에 `.env.local` 파일을 만들고 아래 내용을 넣으세요.

```env
NOTION_API_KEY=여기에_액세스_토큰_붙여넣기
NOTION_GOALS_DB_ID=38d5da5c509280248acfd133632b51bf
NOTION_TASKS_DB_ID=38d5da5c509280fcadceca55d07d8f1f
NOTION_REFLECTIONS_DB_ID=38d5da5c509280efb9dff0246e2f8f56
```

`NOTION_API_KEY`는 Notion 연결 화면에서 복사한 액세스 토큰입니다.

## 2. 실행하기

Node.js가 설치되어 있으면:

```bash
npm run dev
```

Codex 번들 Node를 사용할 때:

```powershell
C:\Users\jang0\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe dev-server.js
```

실행 후 아래 주소를 열면 됩니다.

```text
http://localhost:3000
```

## 3. 버튼 기능

- `오늘 계획 생성`: Notion Tasks와 Goals를 읽어 우선순위 3개를 추천합니다.
- `목표 현황 보기`: Goals의 진행률과 상태를 요약합니다.
- `주간 리포트 생성`: Reflections의 최근 기록을 요약합니다.
- `회고 저장`: 입력한 회고를 정리해서 Reflections에 새 항목으로 저장합니다.

## 4. 무료 버전 설명

이 버전은 OpenAI API를 사용하지 않습니다. 대신 Notion 데이터의 마감일, 우선순위, 상태, 진행률을 기준으로 규칙 기반 판단을 수행합니다.
