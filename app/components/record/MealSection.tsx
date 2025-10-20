import { Trash2 } from "lucide-react";
import React from "react";
import { FoodItem } from "../../types";

interface MealSectionProps {
  meal: string;
  mealName: string;
  mealItems: FoodItem[];
  foodDatabase: Array<{ id: number; name: string; protein: number }>;
  onAddFood: (foodId: number) => void;
  onRemoveFood: (foodId: number) => void;
}

export const MealSection: React.FC<MealSectionProps> = ({
  mealName,
  mealItems,
  foodDatabase,
  onAddFood,
  onRemoveFood,
}) => {
  const mealTotal = mealItems.reduce((sum, food) => sum + food.protein, 0);

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-medium">{mealName}</h4>
        <span className="text-sm text-gray-600">{mealTotal.toFixed(1)}g</span>
      </div>

      <div className="space-y-1 mb-2">
        {mealItems.map((foodItem) => (
          <div
            key={foodItem.id}
            className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded"
          >
            <span>{foodItem.name}</span>
            <div className="flex items-center gap-2">
              <span>{foodItem.protein}g</span>
              <button
                onClick={() => onRemoveFood(foodItem.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <select
        onChange={(e) => {
          if (e.target.value) {
            onAddFood(parseInt(e.target.value));
            e.target.value = "";
          }
        }}
        className="w-full p-2 text-sm border rounded-lg"
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
    </div>
  );
};
