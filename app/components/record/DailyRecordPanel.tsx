import { Trash2 } from "lucide-react";
import React, { useRef, useState } from "react";
import { MEAL_NAMES } from "../../constants";
import { DayRecord, FoodItem, MealType, NutritionLookupResult } from "../../types";

interface DirectInputState {
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
}

interface DirectInputData {
  breakfast: { name: string; amount: string; protein: string };
  lunch: { name: string; amount: string; protein: string };
  dinner: { name: string; amount: string; protein: string };
}

type LookupStatus = "idle" | "loading" | "not_found" | "error";

const SEARCH_DEBOUNCE_MS = 400;

interface DailyRecordPanelProps {
  selectedDate: string;
  currentRecord: DayRecord;
  totalProtein: number;
  targetProtein: number;
  foodDatabase: FoodItem[];
  directInputMode: DirectInputState;
  directInputData: DirectInputData;
  onToggleCardio: () => void;
  onToggleStrength: () => void;
  onAddFood: (meal: MealType, foodId: number) => void;
  onRemoveFood: (meal: MealType, foodId: number) => void;
  onDirectInputModeChange: React.Dispatch<
    React.SetStateAction<DirectInputState>
  >;
  onDirectInputDataChange: React.Dispatch<
    React.SetStateAction<DirectInputData>
  >;
  onAddDirectFood: (meal: "breakfast" | "lunch" | "dinner") => void;
  onDirectInputKeyDown: (
    e: React.KeyboardEvent,
    meal: "breakfast" | "lunch" | "dinner"
  ) => void;
  onSearchNutrition: (foodName: string) => Promise<NutritionLookupResult[]>;
}

export const DailyRecordPanel: React.FC<DailyRecordPanelProps> = ({
  selectedDate,
  currentRecord,
  totalProtein,
  targetProtein,
  foodDatabase,
  directInputMode,
  directInputData,
  onToggleCardio,
  onToggleStrength,
  onAddFood,
  onRemoveFood,
  onDirectInputModeChange,
  onDirectInputDataChange,
  onAddDirectFood,
  onDirectInputKeyDown,
  onSearchNutrition,
}) => {
  const [proteinPer100g, setProteinPer100g] = useState<
    Record<MealType, number | null>
  >({ breakfast: null, lunch: null, dinner: null });
  const [lookupStatus, setLookupStatus] = useState<
    Record<MealType, LookupStatus>
  >({ breakfast: "idle", lunch: "idle", dinner: "idle" });
  const [suggestions, setSuggestions] = useState<
    Record<MealType, NutritionLookupResult[]>
  >({ breakfast: [], lunch: [], dinner: [] });
  const [showSuggestions, setShowSuggestions] = useState<
    Record<MealType, boolean>
  >({ breakfast: false, lunch: false, dinner: false });
  const debounceTimers = useRef<
    Record<MealType, ReturnType<typeof setTimeout> | null>
  >({ breakfast: null, lunch: null, dinner: null });

  const computeProtein = (per100g: number, amount: string): string => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) return "";
    return ((per100g * amountNum) / 100).toFixed(1);
  };

  const handleFoodNameChange = (meal: MealType, name: string) => {
    setProteinPer100g((prev) => ({ ...prev, [meal]: null }));
    onDirectInputDataChange((prev) => ({
      ...prev,
      [meal]: { ...prev[meal], name },
    }));

    const timer = debounceTimers.current[meal];
    if (timer) clearTimeout(timer);

    if (!name.trim()) {
      setSuggestions((prev) => ({ ...prev, [meal]: [] }));
      setShowSuggestions((prev) => ({ ...prev, [meal]: false }));
      setLookupStatus((prev) => ({ ...prev, [meal]: "idle" }));
      return;
    }

    setLookupStatus((prev) => ({ ...prev, [meal]: "loading" }));
    setShowSuggestions((prev) => ({ ...prev, [meal]: true }));

    debounceTimers.current[meal] = setTimeout(async () => {
      const results = await onSearchNutrition(name);
      setSuggestions((prev) => ({ ...prev, [meal]: results }));
      setLookupStatus((prev) => ({
        ...prev,
        [meal]: results.length === 0 ? "not_found" : "idle",
      }));
    }, SEARCH_DEBOUNCE_MS);
  };

  const handleSelectSuggestion = (
    meal: MealType,
    suggestion: NutritionLookupResult
  ) => {
    setProteinPer100g((prev) => ({ ...prev, [meal]: suggestion.proteinPer100g }));
    setShowSuggestions((prev) => ({ ...prev, [meal]: false }));
    setLookupStatus((prev) => ({ ...prev, [meal]: "idle" }));
    onDirectInputDataChange((prev) => {
      // 섭취량을 아직 입력하지 않았다면 100g을 기본값으로 채워서
      // 선택 직후에도 단백질량이 계산되고 추가 버튼이 바로 활성화되게 함
      const amount = prev[meal].amount || "100";
      return {
        ...prev,
        [meal]: {
          ...prev[meal],
          name: suggestion.name,
          amount,
          protein: computeProtein(suggestion.proteinPer100g, amount),
        },
      };
    });
  };

  const handleAmountChange = (meal: MealType, amount: string) => {
    const per100g = proteinPer100g[meal];
    onDirectInputDataChange((prev) => ({
      ...prev,
      [meal]: {
        ...prev[meal],
        amount,
        protein: per100g ? computeProtein(per100g, amount) : prev[meal].protein,
      },
    }));
  };
  const progressPercentage = Math.min(
    (totalProtein / targetProtein) * 100,
    100
  );

  return (
    <div className="bg-surface rounded-xl border border-border p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          {new Date(selectedDate).getMonth() + 1}/
          {new Date(selectedDate).getDate()} 기록
        </h3>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={currentRecord.hasCardio}
              onChange={onToggleCardio}
              className="w-4 h-4 accent-accent"
            />
            <span className="text-sm text-muted">유산소</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={currentRecord.hasStrength}
              onChange={onToggleStrength}
              className="w-4 h-4 accent-accent"
            />
            <span className="text-sm text-muted">근력운동</span>
          </label>
        </div>
      </div>

      {/* 진행률 */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2 text-muted">
          <span>진행률</span>
          <span>
            {totalProtein.toFixed(1)}g / {targetProtein.toFixed(0)}g
          </span>
        </div>
        <div className="w-full bg-muted-bg-hover rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              progressPercentage >= 100 ? "bg-success" : "bg-accent"
            }`}
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          ></div>
        </div>
        <div className="text-center mt-2 text-sm">
          {totalProtein >= targetProtein ? (
            <span className="text-success font-medium">목표 달성! 🎉</span>
          ) : (
            <span className="text-muted">
              {(targetProtein - totalProtein).toFixed(1)}g 부족
            </span>
          )}
        </div>
      </div>

      {/* 식사별 기록 */}
      {(["breakfast", "lunch", "dinner"] as const).map((meal) => {
        const mealTotal = currentRecord[meal].reduce(
          (sum, food) => sum + food.protein,
          0
        );

        return (
          <div key={meal} className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-foreground">
                {MEAL_NAMES[meal]}
              </h4>
              <span className="text-sm text-muted">
                {mealTotal.toFixed(1)}g
              </span>
            </div>

            <div className="space-y-1 mb-2">
              {currentRecord[meal].map((foodItem) => (
                <div
                  key={foodItem.id}
                  className="flex justify-between items-center text-sm bg-muted-bg p-2 rounded-lg"
                >
                  <span className="text-foreground">{foodItem.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted">{foodItem.protein}g</span>
                    <button
                      onClick={() => onRemoveFood(meal, foodItem.id)}
                      className="text-muted hover:text-danger"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 입력 모드 토글 버튼 */}
            <div className="flex gap-2 mb-2">
              <button
                onClick={() =>
                  onDirectInputModeChange((prev) => ({
                    ...prev,
                    [meal]: false,
                  }))
                }
                className={`px-3 py-1 text-xs rounded-lg ${
                  !directInputMode[meal]
                    ? "bg-accent text-white"
                    : "bg-muted-bg text-foreground hover:bg-muted-bg-hover"
                }`}
              >
                목록선택
              </button>
              <button
                onClick={() =>
                  onDirectInputModeChange((prev) => ({
                    ...prev,
                    [meal]: true,
                  }))
                }
                className={`px-3 py-1 text-xs rounded-lg ${
                  directInputMode[meal]
                    ? "bg-accent text-white"
                    : "bg-muted-bg text-foreground hover:bg-muted-bg-hover"
                }`}
              >
                직접입력
              </button>
            </div>

            {directInputMode[meal] ? (
              /* 직접 입력 모드 */
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="음식명 (예: 닭가슴살)"
                    value={directInputData[meal].name}
                    onChange={(e) => handleFoodNameChange(meal, e.target.value)}
                    onFocus={() =>
                      suggestions[meal].length > 0 &&
                      setShowSuggestions((prev) => ({ ...prev, [meal]: true }))
                    }
                    onBlur={() =>
                      setShowSuggestions((prev) => ({ ...prev, [meal]: false }))
                    }
                    className="w-full p-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-accent"
                  />
                  {showSuggestions[meal] && suggestions[meal].length > 0 && (
                    <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-auto bg-surface border border-border rounded-lg shadow-md">
                      {suggestions[meal].map((suggestion, index) => (
                        <li key={`${suggestion.name}-${index}`}>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectSuggestion(meal, suggestion);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted-bg flex justify-between gap-2"
                          >
                            <span className="text-foreground">
                              {suggestion.name}
                            </span>
                            <span className="text-muted shrink-0">
                              {suggestion.proteinPer100g.toFixed(1)}g/100g
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {lookupStatus[meal] === "loading" && (
                  <div className="text-xs text-muted">
                    단백질 함량 검색 중...
                  </div>
                )}
                {lookupStatus[meal] === "not_found" && (
                  <div className="text-xs text-muted">
                    일치하는 음식을 찾지 못했어요. 단백질(g)을 직접
                    입력해주세요.
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="1"
                    placeholder="섭취량(g)"
                    value={directInputData[meal].amount}
                    onChange={(e) => handleAmountChange(meal, e.target.value)}
                    onKeyDown={(e) => onDirectInputKeyDown(e, meal)}
                    className="min-w-0 flex-1 p-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-accent"
                  />
                  <input
                    type="number"
                    step="0.1"
                    placeholder="단백질(g)"
                    value={directInputData[meal].protein}
                    onChange={(e) =>
                      onDirectInputDataChange((prev) => ({
                        ...prev,
                        [meal]: {
                          ...prev[meal],
                          protein: e.target.value,
                        },
                      }))
                    }
                    onKeyDown={(e) => onDirectInputKeyDown(e, meal)}
                    className="min-w-0 flex-1 p-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-accent"
                  />
                </div>
                <button
                  onClick={() => onAddDirectFood(meal)}
                  disabled={
                    !directInputData[meal].name ||
                    !directInputData[meal].protein
                  }
                  className="w-full px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:bg-muted-bg-hover disabled:text-muted disabled:cursor-not-allowed text-sm"
                >
                  추가
                </button>
              </div>
            ) : (
              /* 기존 dropdown 선택 모드 */
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    onAddFood(meal, parseInt(e.target.value));
                    e.target.value = "";
                  }
                }}
                className="w-full p-2 text-sm border border-border rounded-lg"
              >
                <option value="">음식 추가...</option>
                {foodDatabase
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((foodItem) => (
                    <option key={foodItem.id} value={foodItem.id}>
                      {foodItem.name} ({foodItem.protein}g)
                    </option>
                  ))}
              </select>
            )}
          </div>
        );
      })}
    </div>
  );
};
