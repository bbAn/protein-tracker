import { NextRequest, NextResponse } from "next/server";

// 식약처 식품영양성분DB(FoodNtrCpntDbInfo02) 응답 필드: AMT_NUM3이 100g당 단백질(g)
interface NutritionItem {
  FOOD_NM_KR: string;
  AMT_NUM3: string;
}

interface NutritionApiResponse {
  header: { resultCode: string; resultMsg: string };
  body?: { items?: NutritionItem[] };
}

const API_BASE =
  "https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ error: "음식명이 필요합니다." }, { status: 400 });
  }

  // 공공데이터포털에서 발급하는 "Encoding" 인증키는 이미 URL 인코딩되어 있어
  // 그대로 이어붙여야 함 (encodeURIComponent를 다시 적용하면 이중 인코딩되어 깨짐)
  const apiKey = process.env.FOOD_NUTRITION_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "영양성분 API 키가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const apiUrl =
    `${API_BASE}?serviceKey=${apiKey}` +
    `&pageNo=1&numOfRows=20&type=json&FOOD_NM_KR=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: "영양성분 조회 서비스 호출에 실패했습니다." },
        { status: 502 }
      );
    }

    const data: NutritionApiResponse = await response.json();

    if (data.header.resultCode !== "00") {
      return NextResponse.json(
        { error: "영양성분 조회 서비스 호출에 실패했습니다." },
        { status: 502 }
      );
    }

    const items = data.body?.items ?? [];

    // 이름이 짧은(원재료에 가까운) 순으로 정렬, 단백질 값이 없는 항목은 제외,
    // 이름이 같은 항목은 중복 제거
    const seen = new Set<string>();
    const results = items
      .map((item) => ({
        name: item.FOOD_NM_KR,
        proteinPer100g: parseFloat(item.AMT_NUM3),
      }))
      .filter((item) => !isNaN(item.proteinPer100g))
      .sort((a, b) => a.name.length - b.name.length)
      .filter((item) => {
        if (seen.has(item.name)) return false;
        seen.add(item.name);
        return true;
      })
      .slice(0, 8);

    if (results.length === 0) {
      return NextResponse.json(
        { error: "일치하는 음식을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "영양성분 조회 중 오류가 발생했습니다." },
      { status: 502 }
    );
  }
}
