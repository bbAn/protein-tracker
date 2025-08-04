// 한국 시간 기준 날짜 문자열 생성
export const getKoreanDateString = (date: Date): string => {
  // 한국 시간대로 변환 (UTC+9)
  const koreanTime = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return koreanTime.toISOString().split("T")[0]; // YYYY-MM-DD 형식
};

// 현재 한국 날짜 문자열
export const getToday = (): string => {
  return getKoreanDateString(new Date());
};

// 날짜 문자열을 일관성 있게 변환하는 함수
export const dateStringToDateKey = (dateStr: string): string => {
  // "2025-08-01" → "Thu Aug 01 2025" 형태로 변환
  const [year, month, day] = dateStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return date.toDateString();
};

// DateKey를 데이터베이스 날짜 형식으로 변환
export const dateKeyToDateString = (dateKey: string): string => {
  const date = new Date(dateKey);
  return getKoreanDateString(date);
};

// 달력 생성 함수
export const generateCalendar = (date: Date): (Date | null)[] => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days: (Date | null)[] = [];

  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }

  return days;
};
