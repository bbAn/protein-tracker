import { Check, Edit, Plus, Trash2, X } from "lucide-react";
import React from "react";

// FoodItem 중복 제거 - 하나만 import
interface FoodItem {
  id: number;
  user_id?: string;
  name: string;
  protein: number;
  is_default?: boolean;
  created_at?: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bodyWeight: number;
  tempBodyWeight: string;
  onBodyWeightChange: (value: string) => void;
  onBodyWeightSubmit: () => void;
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
  onBodyWeightChange,
  onBodyWeightSubmit,
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">설정</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

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
          <p className="text-xs text-gray-600 mt-1">
            일반: {(bodyWeight * 1.6).toFixed(0)}g, 운동:{" "}
            {(bodyWeight * 2.2).toFixed(0)}g
          </p>
          <p className="text-xs text-blue-600 mt-1">
            💡 입력 후 엔터키를 누르거나 다른 곳을 클릭하면 저장됩니다.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            음식 데이터베이스
          </label>

          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newFood.name}
              onChange={(e) =>
                onNewFoodChange({ ...newFood, name: e.target.value })
              }
              placeholder="음식 이름"
              className="flex-1 p-2 text-sm border rounded-lg"
            />
            <input
              type="number"
              value={newFood.protein}
              onChange={(e) =>
                onNewFoodChange({ ...newFood, protein: e.target.value })
              }
              placeholder="단백질(g)"
              className="w-24 p-2 text-sm border rounded-lg"
            />
            <button
              onClick={onAddFood}
              className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="space-y-1 max-h-48 overflow-y-auto">
            {foodDatabase
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((foodItem) => (
                <div
                  key={foodItem.id}
                  className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded"
                >
                  {editingFood === foodItem.id ? (
                    <div className="flex gap-2 flex-1">
                      <input
                        type="text"
                        defaultValue={foodItem.name}
                        onBlur={(e) => {
                          const target = e.target as HTMLInputElement;
                          onUpdateFood(foodItem.id, { name: target.value });
                        }}
                        className="flex-1 p-1 text-xs border rounded"
                      />
                      <input
                        type="number"
                        defaultValue={foodItem.protein}
                        onBlur={(e) => {
                          const target = e.target as HTMLInputElement;
                          onUpdateFood(foodItem.id, {
                            protein: parseFloat(target.value),
                          });
                        }}
                        className="w-16 p-1 text-xs border rounded"
                      />
                      <button
                        onClick={onStopEditing}
                        className="text-green-500"
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span>
                        {foodItem.name} ({foodItem.protein}g)
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => onEditFood(foodItem.id)}
                          className="text-blue-500"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => onDeleteFood(foodItem.id)}
                          className="text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
