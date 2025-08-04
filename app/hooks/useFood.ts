import { useCallback, useState } from "react";
import { supabase } from "../../lib/supabase";
import { FoodItem, CalcResult, SupabaseUser } from "../types";
import { DEFAULT_FOODS } from "../constants";

export const useFood = (user: SupabaseUser | null) => {
  const [foodDatabase, setFoodDatabase] = useState<FoodItem[]>(DEFAULT_FOODS);
  const [editingFood, setEditingFood] = useState<number | null>(null);
  const [newFood, setNewFood] = useState<{ name: string; protein: string }>({
    name: "",
    protein: "",
  });

  // 계산기 상태
  const [calcFood, setCalcFood] = useState<string>("");
  const [calcAmount, setCalcAmount] = useState<string>("");
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);

  // 음식 데이터베이스 로드
  const loadFoodDatabase = useCallback(async (userId: string) => {
    try {
      const { data: foods } = await supabase
        .from("food_database")
        .select("*")
        .or(`is_default.eq.true,user_id.eq.${userId}`);

      if (foods) {
        setFoodDatabase(foods);
      }
    } catch (error) {
      console.error("Error loading food database:", error);
    }
  }, []);

  // 새 음식 추가
  const addNewFood = async (): Promise<boolean> => {
    if (!newFood.name || !newFood.protein || !user) return false;

    try {
      const { data, error } = await supabase
        .from("food_database")
        .insert({
          user_id: user.id,
          name: newFood.name,
          protein: parseFloat(newFood.protein),
        })
        .select()
        .single();

      if (error) throw error;

      setFoodDatabase([...foodDatabase, data]);
      setNewFood({ name: "", protein: "" });
      return true;
    } catch (error) {
      console.error("Error adding food:", error);
      alert("음식 추가 중 오류가 발생했습니다.");
      return false;
    }
  };

  // 음식 삭제
  const deleteFood = async (id: number): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("food_database")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      setFoodDatabase(foodDatabase.filter((food) => food.id !== id));
      return true;
    } catch (error) {
      console.error("Error deleting food:", error);
      return false;
    }
  };

  // 음식 수정
  const updateFood = async (
    id: number,
    updatedFood: Partial<FoodItem>
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("food_database")
        .update(updatedFood)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      setFoodDatabase(
        foodDatabase.map((food) =>
          food.id === id ? { ...food, ...updatedFood } : food
        )
      );
      setEditingFood(null);
      return true;
    } catch (error) {
      console.error("Error updating food:", error);
      return false;
    }
  };

  // 단백질 계산
  const calculateProtein = (): void => {
    const food = foodDatabase.find((f) =>
      f.name.toLowerCase().includes(calcFood.toLowerCase())
    );

    if (food && calcAmount) {
      const baseAmount = parseInt(food.name.match(/\d+/)?.[0] || "100");
      const ratio = parseFloat(calcAmount) / baseAmount;
      const result = food.protein * ratio;
      setCalcResult({
        food: food.name,
        amount: calcAmount,
        protein: result.toFixed(1),
      });
    } else {
      setCalcResult(null);
    }
  };

  return {
    // 상태
    foodDatabase,
    editingFood,
    newFood,
    calcFood,
    calcAmount,
    calcResult,

    // 상태 변경
    setEditingFood,
    setNewFood,
    setCalcFood,
    setCalcAmount,
    setCalcResult,

    // 액션
    loadFoodDatabase,
    addNewFood,
    deleteFood,
    updateFood,
    calculateProtein,
  };
};
