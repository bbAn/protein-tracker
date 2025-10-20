import { Check, Edit, Plus, Trash2, X } from "lucide-react";
import React from "react";

interface FoodItem {
  id: number;
  user_id?: string;
  name: string;
  protein: number;
  is_default?: boolean;
  created_at?: string;
}

interface ProteinGoalConfig {
  name: string;
  icon: string;
  description: string;
  normal: number;
  workout: number;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bodyWeight: number;
  tempBodyWeight: string;
  gender: "male" | "female";
  proteinGoal: string;
  proteinGoals: Record<string, Record<string, ProteinGoalConfig>>;
  onBodyWeightChange: (value: string) => void;
  onBodyWeightSubmit: () => void;
  onGenderChange: (gender: "male" | "female") => void;
  onProteinGoalChange: (goal: string) => void;
  getProteinMultipliers: () => ProteinGoalConfig;
  foodDatabase: FoodItem[];
  newFood: { name: string; protein: string };
  editingFood: number | null;
  onNewFoodChange: (newFood: { name: string; protein: string }) => void;
  onAddFood: () => void;
  onEditFood: (id: number) => void;
  onUpdateFood: (
    id: number,
    updates: { name?: string; protein?: number }
  ) => void;
  onDeleteFood: (id: number) => void;
  onStopEditing: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  bodyWeight,
  tempBodyWeight,
  gender,
  proteinGoal,
  proteinGoals,
  onBodyWeightChange,
  onBodyWeightSubmit,
  onGenderChange,
  onProteinGoalChange,
  getProteinMultipliers,
  foodDatabase,
  newFood,
  editingFood,
  onNewFoodChange,
  onAddFood,
  onEditFood,
  onUpdateFood,
  onDeleteFood,
  onStopEditing,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">설정</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* 성별 선택 */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">성별</label>
          <div className="flex gap-3">
            <button
              onClick={() => onGenderChange("male")}
              className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                gender === "male"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="text-2xl mb-1">👨</div>
              <div className="font-medium">남자</div>
            </button>
            <button
              onClick={() => onGenderChange("female")}
              className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                gender === "female"
                  ? "border-pink-500 bg-pink-50 text-pink-700"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="text-2xl mb-1">👩</div>
              <div className="font-medium">여자</div>
            </button>
          </div>
        </div>

        {/* 단백질 목적 설정 */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">
            단백질 섭취 목적
          </label>
          <div className="space-y-3">
            {Object.entries(proteinGoals[gender]).map(([key, goal]) => (
              <div
                key={key}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  proteinGoal === key
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => onProteinGoalChange(key)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{goal.icon}</span>
                    <div>
                      <div className="font-medium">{goal.name}</div>
                      <div className="text-xs text-gray-600">
                        {goal.description}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">
                      일반: {goal.normal}g/kg
                    </div>
                    <div className="text-xs text-gray-500">
                      근력: {goal.workout}g/kg
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 체중 설정 */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">체중 (kg)</label>
          <input
            type="number"
            value={tempBodyWeight}
            onChange={(e) => onBodyWeightChange(e.target.value)}
            onBlur={onBodyWeightSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onBodyWeightSubmit();
              }
            }}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="체중을 입력하세요"
            min="1"
            step="0.1"
          />

          {/* 현재 설정에 따른 단백질 목표량 표시 */}
          <div className="mt-2 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-1">
              {getProteinMultipliers().icon} 현재 설정:{" "}
              {getProteinMultipliers().name}
            </div>
            <div className="text-xs text-gray-600 mb-2">
              {getProteinMultipliers().description}
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                일반:{" "}
                <strong>
                  {(bodyWeight * getProteinMultipliers().normal).toFixed(0)}g
                </strong>
              </span>
              <span className="text-gray-600">
                근력:{" "}
                <strong>
                  {(bodyWeight * getProteinMultipliers().workout).toFixed(0)}g
                </strong>
              </span>
            </div>
          </div>

          <p className="text-xs text-blue-600 mt-2">
            💡 입력 후 엔터키를 누르거나 다른 곳을 클릭하면 저장됩니다.
          </p>
        </div>

        {/* 나만의 음식 관리 */}
        <div className="mb-6">
          <h4 className="font-medium mb-3">나만의 음식 관리</h4>

          {/* 새 음식 추가 */}
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="음식 이름 (예: 닭가슴살 150g)"
              value={newFood.name}
              onChange={(e) =>
                onNewFoodChange({ ...newFood, name: e.target.value })
              }
              className="flex-1 p-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              step="0.1"
              placeholder="단백질(g)"
              value={newFood.protein}
              onChange={(e) =>
                onNewFoodChange({ ...newFood, protein: e.target.value })
              }
              className="w-24 p-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={onAddFood}
              disabled={!newFood.name || !newFood.protein}
              className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* 내가 추가한 음식 목록 */}
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {foodDatabase
              .filter((foodItem) => !foodItem.is_default)
              .map((foodItem) => (
                <div
                  key={foodItem.id}
                  className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded-lg"
                >
                  {editingFood === foodItem.id ? (
                    // 편집 모드
                    <div className="flex gap-2 flex-1">
                      <input
                        type="text"
                        defaultValue={foodItem.name}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const target = e.target as HTMLInputElement;
                            onUpdateFood(foodItem.id, { name: target.value });
                          }
                        }}
                        className="flex-1 p-1 text-xs border rounded focus:ring-1 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        step="0.1"
                        defaultValue={foodItem.protein}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const target = e.target as HTMLInputElement;
                            onUpdateFood(foodItem.id, {
                              protein: parseFloat(target.value),
                            });
                          }
                        }}
                        className="w-16 p-1 text-xs border rounded focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        onClick={onStopEditing}
                        className="text-green-500 hover:text-green-700"
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  ) : (
                    // 보기 모드
                    <>
                      <span className="flex-1">
                        {foodItem.name} ({foodItem.protein}g)
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => onEditFood(foodItem.id)}
                          className="text-blue-500 hover:text-blue-700 p-1"
                        >
                          <Edit size={12} />
                        </button>
                        <button
                          onClick={() => onDeleteFood(foodItem.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
          </div>

          {foodDatabase.filter((foodItem) => !foodItem.is_default).length ===
            0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              아직 추가한 음식이 없습니다.
            </p>
          )}
        </div>

        {/* 닫기 버튼 */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
