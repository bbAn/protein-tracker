# 단백질 트래커

일일 단백질 섭취량을 기록하고 관리하는 웹 애플리케이션입니다.

## 주요 기능

- 📅 달력으로 일일 기록 관리 (보고 있는 달만 불러오는 지연 로딩)
- 🍽️ 끼니(아침/점심/저녁)별 단백질 섭취량 추적
- 🔍 음식명 검색 시 식약처 식품영양성분DB 기반 단백질량 자동 계산
- 💊 끼니별 영양제·건강식품 기록 (나만의 목록에서 선택 또는 직접입력, 단백질 계산과는 무관)
- 💪 유산소/근력 운동 여부 체크 및 캘린더 표시
- 📊 성별·체중·목적(다이어트/체중유지/벌크업)에 따른 목표 단백질량 및 달성률 시각화
- 🌗 다크모드 지원

## 기술 스택

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- Supabase (Auth, Postgres, RLS)
- 식품의약품안전처 식품영양성분DB Open API

## 환경 변수 (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
FOOD_NUTRITION_API_KEY=
```

`FOOD_NUTRITION_API_KEY`는 공공데이터포털(data.go.kr)에서 발급받는 서버 전용 키로, 음식명 검색 시 단백질량 자동 계산에 사용됩니다.

## 설치 및 실행

```bash
npm install
npm run dev
```
