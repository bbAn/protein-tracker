import React from "react";
import { MEAL_NAMES } from "../../constants";
import { DayRecord, FoodItem, MealType } from "../../types";
import { dateKeyToDateString } from "../../utils/dateUtils";
import { MealSection } from "./MealSection";

interface DailyRecordPanelProps {
  selectedDate: string;
  currentRecord: DayRecord; // DailyRecord에서 DayRecord로 변경
  totalProtein: number;
  targetProtein: number;
  foodDatabase: FoodItem[];
  onToggleWorkoutDay: () => void;
  onAddFood: (meal: MealType, foodId: number) => void;
  onRemoveFood: (meal: MealType, foodId: number) => void;
}

export const DailyRecordPanel: React.FC<DailyRecordPanelProps> = ({
  selectedDate,
  currentRecord,
  totalProtein,
  targetProtein,
  foodDatabase,
  onToggleWorkoutDay,
  onAddFood,
  onRemoveFood,
}) => {
  const progressPercentage = Math.min(
    (totalProtein / targetProtein) * 100,
    100
  );

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          {new Date(selectedDate).getMonth() + 1}/
          {new Date(selectedDate).getDate()} 기록
        </h3>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={currentRecord.isWorkoutDay}
            onChange={onToggleWorkoutDay}
            className="w-4 h-4"
          />
          <span className="text-sm">운동한 날</span>
        </label>
      </div>

      {/* 진행률 */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span>진행률</span>
          <span>
            {totalProtein.toFixed(1)}g / {targetProtein.toFixed(0)}g
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              progressPercentage >= 100 ? "bg-green-500" : "bg-blue-500"
            }`}
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          ></div>
        </div>
        <div className="text-center mt-2 text-sm">
          {totalProtein >= targetProtein ? (
            <span className="text-green-600 font-semibold">목표 달성! 🎉</span>
          ) : (
            <span className="text-orange-600">
              {(targetProtein - totalProtein).toFixed(1)}g 부족
            </span>
          )}
        </div>

        {/* 디버깅 정보 */}
        <div className="text-xs text-gray-400 mt-2 p-2 bg-gray-50 rounded">
          <div>🕐 현재 시간: {new Date().toLocaleString("ko-KR")}</div>
          <div>📅 선택된 날짜: {selectedDate}</div>
          <div>🌏 DB 저장 날짜: {dateKeyToDateString(selectedDate)}</div>
          <div>
            📊 오늘 기록 수:{" "}
            {
              [
                ...currentRecord.breakfast,
                ...currentRecord.lunch,
                ...currentRecord.dinner,
              ].length
            }
            개
          </div>
          <div>💪 운동한 날: {currentRecord.isWorkoutDay ? "✅" : "❌"}</div>
        </div>
      </div>

      {/* 식사별 기록 */}
      {(["breakfast", "lunch", "dinner"] as const).map((meal) => (
        <MealSection
          key={meal}
          meal={meal}
          mealName={MEAL_NAMES[meal]}
          mealItems={currentRecord[meal]}
          foodDatabase={foodDatabase}
          onAddFood={(foodId) => onAddFood(meal, foodId)}
          onRemoveFood={(foodId) => onRemoveFood(meal, foodId)}
        />
      ))}
    </div>
  );
};
