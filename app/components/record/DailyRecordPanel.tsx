import { Trash2 } from "lucide-react";
import React, { useRef, useState } from "react";
import { MEAL_NAMES } from "../../constants";
import {
  DayRecord,
  FoodItem,
  MealType,
  NutritionLookupResult,
  SupplementDatabaseItem,
} from "../../types";

interface DirectInputState {
  breakfast: boolean;
  lunch: boolean;
  snack: boolean;
  dinner: boolean;
}

interface DirectInputData {
  breakfast: { name: string; amount: string; protein: string };
  lunch: { name: string; amount: string; protein: string };
  snack: { name: string; amount: string; protein: string };
  dinner: { name: string; amount: string; protein: string };
}

type LookupStatus = "idle" | "loading" | "not_found" | "error";

const SEARCH_DEBOUNCE_MS = 400;

const MEAL_ICONS: Record<MealType, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  snack: "🍎",
  dinner: "🌙",
};

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
  onAddDirectFood: (meal: MealType) => void;
  onDirectInputKeyDown: (e: React.KeyboardEvent, meal: MealType) => void;
  onSearchNutrition: (foodName: string) => Promise<NutritionLookupResult[]>;
  supplementDatabase: SupplementDatabaseItem[];
  onAddSupplement: (meal: MealType, name: string, note: string) => void;
  onRemoveSupplement: (meal: MealType, supplementId: number) => void;
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
  supplementDatabase,
  onAddSupplement,
  onRemoveSupplement,
}) => {
  const [supplementInput, setSupplementInput] = useState<
    Record<MealType, { name: string; note: string }>
  >({
    breakfast: { name: "", note: "" },
    lunch: { name: "", note: "" },
    snack: { name: "", note: "" },
    dinner: { name: "", note: "" },
  });
  const [supplementInputMode, setSupplementInputMode] = useState<
    Record<MealType, boolean>
  >({ breakfast: false, lunch: false, snack: false, dinner: false });

  const handleAddSupplement = (meal: MealType) => {
    const input = supplementInput[meal];
    if (!input.name.trim()) return;
    onAddSupplement(meal, input.name.trim(), input.note.trim());
    setSupplementInput((prev) => ({
      ...prev,
      [meal]: { name: "", note: "" },
    }));
  };

  const [proteinPer100g, setProteinPer100g] = useState<
    Record<MealType, number | null>
  >({ breakfast: null, lunch: null, snack: null, dinner: null });
  const [lookupStatus, setLookupStatus] = useState<
    Record<MealType, LookupStatus>
  >({ breakfast: "idle", lunch: "idle", snack: "idle", dinner: "idle" });
  const [suggestions, setSuggestions] = useState<
    Record<MealType, NutritionLookupResult[]>
  >({ breakfast: [], lunch: [], snack: [], dinner: [] });
  const [showSuggestions, setShowSuggestions] = useState<
    Record<MealType, boolean>
  >({ breakfast: false, lunch: false, snack: false, dinner: false });
  const debounceTimers = useRef<
    Record<MealType, ReturnType<typeof setTimeout> | null>
  >({ breakfast: null, lunch: null, snack: null, dinner: null });

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
      {(["breakfast", "lunch", "snack", "dinner"] as const).map((meal) => {
        const mealTotal = currentRecord[meal].reduce(
          (sum, food) => sum + food.protein,
          0
        );

        return (
          <div
            key={meal}
            className="mb-4 p-4 rounded-xl border border-border bg-background"
          >
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-foreground flex items-center gap-1.5">
                <span aria-hidden="true">{MEAL_ICONS[meal]}</span>
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
                      aria-label={`${foodItem.name} 삭제`}
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
                  {showSuggestions[meal] &&
                    (lookupStatus[meal] === "loading" ||
                      suggestions[meal].length > 0 ||
                      lookupStatus[meal] === "not_found") && (
                      <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-auto bg-surface border border-border rounded-lg shadow-md">
                        {lookupStatus[meal] === "loading" ? (
                          <li className="flex items-center gap-2 px-3 py-2 text-sm text-muted">
                            <span className="w-3.5 h-3.5 border-2 border-border border-t-accent rounded-full animate-spin shrink-0" />
                            단백질 함량 검색 중...
                          </li>
                        ) : suggestions[meal].length > 0 ? (
                          suggestions[meal].map((suggestion, index) => (
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
                          ))
                        ) : (
                          <li className="px-3 py-2 text-sm text-muted">
                            일치하는 음식을 찾지 못했어요. 단백질(g)을 직접
                            입력해주세요.
                          </li>
                        )}
                      </ul>
                    )}
                </div>
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

            {/* 영양제·건강식품 */}
            <div className="mt-3">
              <h5 className="text-xs font-medium text-muted mb-2">
                영양제·건강식품
              </h5>
              <div className="space-y-1 mb-2">
                {currentRecord.supplements[meal].map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center text-sm bg-muted-bg p-2 rounded-lg"
                  >
                    <span className="text-foreground">
                      {item.name}
                      {item.note && (
                        <span className="text-muted"> · {item.note}</span>
                      )}
                    </span>
                    <button
                      onClick={() => onRemoveSupplement(meal, item.id)}
                      aria-label={`${item.name} 삭제`}
                      className="text-muted hover:text-danger"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() =>
                    setSupplementInputMode((prev) => ({
                      ...prev,
                      [meal]: false,
                    }))
                  }
                  className={`px-3 py-1 text-xs rounded-lg ${
                    !supplementInputMode[meal]
                      ? "bg-accent text-white"
                      : "bg-muted-bg text-foreground hover:bg-muted-bg-hover"
                  }`}
                >
                  목록선택
                </button>
                <button
                  onClick={() =>
                    setSupplementInputMode((prev) => ({
                      ...prev,
                      [meal]: true,
                    }))
                  }
                  className={`px-3 py-1 text-xs rounded-lg ${
                    supplementInputMode[meal]
                      ? "bg-accent text-white"
                      : "bg-muted-bg text-foreground hover:bg-muted-bg-hover"
                  }`}
                >
                  직접입력
                </button>
              </div>

              {supplementInputMode[meal] ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="품목명 (예: 구기자환)"
                    value={supplementInput[meal].name}
                    onChange={(e) =>
                      setSupplementInput((prev) => ({
                        ...prev,
                        [meal]: { ...prev[meal], name: e.target.value },
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSupplement(meal);
                      }
                    }}
                    className="min-w-0 flex-1 p-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-accent"
                  />
                  <input
                    type="text"
                    placeholder="수량/용량 (예: 20알)"
                    value={supplementInput[meal].note}
                    onChange={(e) =>
                      setSupplementInput((prev) => ({
                        ...prev,
                        [meal]: { ...prev[meal], note: e.target.value },
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSupplement(meal);
                      }
                    }}
                    className="min-w-0 flex-1 p-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-accent"
                  />
                  <button
                    onClick={() => handleAddSupplement(meal)}
                    disabled={!supplementInput[meal].name.trim()}
                    className="px-3 py-2 bg-muted-bg text-foreground rounded-lg hover:bg-muted-bg-hover disabled:text-muted disabled:cursor-not-allowed text-sm shrink-0"
                  >
                    추가
                  </button>
                </div>
              ) : (
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      const item = supplementDatabase.find(
                        (s) => s.id === parseInt(e.target.value)
                      );
                      if (item) {
                        const detail = [item.quantity, item.dosage]
                          .filter(Boolean)
                          .join(" · ");
                        onAddSupplement(meal, item.name, detail);
                      }
                      e.target.value = "";
                    }
                  }}
                  className="w-full p-2 text-sm border border-border rounded-lg"
                >
                  <option value="">영양제·건강식품 추가...</option>
                  {supplementDatabase
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((item) => {
                      const detail = [item.quantity, item.dosage]
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <option key={item.id} value={item.id}>
                          {item.name}
                          {detail ? ` (${detail})` : ""}
                        </option>
                      );
                    })}
                </select>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
