"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Plus,
  Settings,
  Calculator,
  Trash2,
  Edit,
  Check,
  X,
  LogOut,
  User,
} from "lucide-react";
import { supabase, FoodItem, DailyRecord, DayRecord } from "../lib/supabase";
import { User as SupabaseUser } from "@supabase/supabase-js";

interface MealData {
  id: number;
  name: string;
  protein: number;
}

interface CalcResult {
  food: string;
  amount: string;
  protein: string;
}

const ProteinTracker: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toDateString()
  );
  const [bodyWeight, setBodyWeight] = useState<number>(70);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showCalculator, setShowCalculator] = useState<boolean>(false);
  const [editingFood, setEditingFood] = useState<number | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // 인증 상태
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  // 음식 데이터베이스
  const [foodDatabase, setFoodDatabase] = useState<FoodItem[]>([]);

  // 일일 기록 데이터
  const [dailyRecords, setDailyRecords] = useState<Record<string, DayRecord>>(
    {}
  );

  // 새 음식 추가 폼
  const [newFood, setNewFood] = useState<{ name: string; protein: string }>({
    name: "",
    protein: "",
  });

  // 체중 입력 임시 상태
  const [tempBodyWeight, setTempBodyWeight] = useState<string>("70");

  // 계산기 상태
  const [calcFood, setCalcFood] = useState<string>("");
  const [calcAmount, setCalcAmount] = useState<string>("");
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);

  // 사용자 표시명
  const [userDisplayName, setUserDisplayName] = useState<string>("");

  // 사용자 인증 체크
  useEffect(() => {
    const checkUser = async (): Promise<void> => {
      try {
        // 세션 스토리지에서 사용자 정보 확인
        const savedUser = sessionStorage.getItem("protein_user");
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          setUser({ id: userData.id } as SupabaseUser);
          setUserDisplayName(userData.username);
          setTempBodyWeight("70"); // 초기값 설정
          await loadUserData(userData.id);
        } else {
          setTempBodyWeight("70"); // 로그인하지 않은 경우에도 초기값 설정
        }
      } catch (error) {
        console.error("Error checking user:", error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  // 사용자 데이터 로드
  const loadUserData = async (userId: string): Promise<void> => {
    try {
      // RLS 설정을 위해 현재 사용자 ID 설정
      await supabase.rpc("set_config", {
        setting_name: "app.current_user_id",
        setting_value: userId,
        is_local: true,
      });

      // 사용자 프로필 로드
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("username, body_weight")
        .eq("id", userId)
        .single();

      if (profile) {
        setBodyWeight(profile.body_weight || 70);
        setTempBodyWeight(String(profile.body_weight || 70)); // 임시 상태도 업데이트
        setUserDisplayName(profile.username);
      }

      // 음식 데이터베이스 로드 (기본 음식 + 사용자 음식)
      const { data: foods } = await supabase
        .from("food_database")
        .select("*")
        .or(`is_default.eq.true,user_id.eq.${userId}`);

      if (foods) {
        setFoodDatabase(foods);
      }

      // 최근 30일 기록 로드
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: records } = await supabase
        .from("daily_records")
        .select("*")
        .eq("user_id", userId)
        .gte("record_date", thirtyDaysAgo.toISOString().split("T")[0]);

      if (records) {
        const recordsMap: Record<string, DayRecord> = {};
        records.forEach((record: DailyRecord) => {
          const dateKey = new Date(record.record_date).toDateString();
          if (!recordsMap[dateKey]) {
            recordsMap[dateKey] = {
              breakfast: [],
              lunch: [],
              dinner: [],
              isWorkoutDay: record.is_workout_day,
            };
          }
          recordsMap[dateKey][record.meal_type].push({
            id: record.id,
            name: record.food_name,
            protein: record.protein_amount,
          });
        });
        setDailyRecords(recordsMap);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  // 비밀번호 해싱 (간단한 해싱 - 실제 배포시에는 더 강력한 해싱 사용)
  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + "protein_salt_2024"); // 솔트 추가
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  // 로그인 (디버깅 버전)
  const handleLogin = async (): Promise<void> => {
    if (!username || !password) {
      alert("아이디와 비밀번호를 입력해주세요.");
      return;
    }

    try {
      const hashedPassword = await hashPassword(password);

      // 디버깅: 해싱된 비밀번호 확인
      console.log("Attempting login with:", {
        username: username.toLowerCase(),
        hashedPassword: hashedPassword.substring(0, 20) + "...", // 보안상 일부만 표시
      });

      // 로그인 함수 호출 (RLS 우회)
      const { data: loginResult, error } = await supabase.rpc("login_user", {
        p_username: username.toLowerCase(),
        p_password_hash: hashedPassword,
      });

      // 디버깅: 결과 확인
      console.log("Login result:", { loginResult, error });

      if (error) {
        console.error("Login error:", error);
        alert("로그인 중 오류가 발생했습니다: " + error.message);
        return;
      }

      if (!loginResult || loginResult.length === 0) {
        // 디버깅: 사용자 존재 여부 확인
        const { data: userCheck } = await supabase
          .from("user_profiles")
          .select("username")
          .eq("username", username.toLowerCase());

        console.log("User exists check:", userCheck);

        if (!userCheck || userCheck.length === 0) {
          alert("존재하지 않는 아이디입니다.");
        } else {
          alert("비밀번호가 잘못되었습니다.");
        }
        return;
      }

      // 로그인 성공
      const userData = loginResult[0];
      const userInfo = {
        id: userData.user_id,
        username: userData.username,
      };

      console.log("Login successful:", userInfo);

      sessionStorage.setItem("protein_user", JSON.stringify(userInfo));
      setUser({ id: userData.user_id } as SupabaseUser);
      setUserDisplayName(userData.username);
      await loadUserData(userData.user_id);

      setUsername("");
      setPassword("");
    } catch (_error) {
      console.error("Login catch error:", _error);
      alert("로그인 중 오류가 발생했습니다.");
    }
  };

  // 회원가입
  const handleSignup = async (): Promise<void> => {
    if (!username || !password || !confirmPassword) {
      alert("모든 필드를 입력해주세요.");
      return;
    }

    if (password !== confirmPassword) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (password.length < 6) {
      alert("비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    // 아이디 형식 검증
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      alert("아이디는 영문, 숫자, 밑줄(_)만 사용 가능합니다.");
      return;
    }

    if (username.length < 3) {
      alert("아이디는 3자 이상이어야 합니다.");
      return;
    }

    try {
      // 비밀번호 해싱
      const hashedPassword = await hashPassword(password);

      // 회원가입 함수 호출 (RLS 우회)
      const { data: newUserId, error } = await supabase.rpc("signup_user", {
        p_username: username.toLowerCase(),
        p_password_hash: hashedPassword,
        p_body_weight: 70,
      });

      if (error) {
        if (error.message.includes("Username already exists")) {
          alert("이미 사용 중인 아이디입니다.");
        } else {
          alert("회원가입 실패: " + error.message);
        }
        return;
      }

      alert("회원가입이 완료되었습니다!");
      setUsername("");
      setPassword("");
      setConfirmPassword("");
      setAuthMode("login");
    } catch (_error) {
      alert("회원가입 중 오류가 발생했습니다.");
    }
  };

  // 로그아웃
  const handleLogout = async (): Promise<void> => {
    sessionStorage.removeItem("protein_user");
    setUser(null);
    setUserDisplayName("");
    setDailyRecords({});
    setBodyWeight(70);
    setTempBodyWeight("70");
    setFoodDatabase([]);
  };

  // 달력 생성 함수
  const generateCalendar = (date: Date): (Date | null)[] => {
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

  // 특정 날짜의 기록 가져오기
  const getDayRecord = (dateString: string): DayRecord => {
    return (
      dailyRecords[dateString] || {
        breakfast: [],
        lunch: [],
        dinner: [],
        isWorkoutDay: false,
      }
    );
  };

  // 특정 날짜의 총 단백질량 계산
  const getTotalProtein = (dateString: string): number => {
    const record = getDayRecord(dateString);
    return [...record.breakfast, ...record.lunch, ...record.dinner].reduce(
      (total, food) => total + food.protein,
      0
    );
  };

  // 목표 단백질량 계산
  const getTargetProtein = (isWorkoutDay: boolean): number => {
    return isWorkoutDay ? bodyWeight * 2.2 : bodyWeight * 1.6;
  };

  // 음식 추가
  const addFoodToMeal = async (
    meal: "breakfast" | "lunch" | "dinner",
    foodId: number
  ): Promise<void> => {
    const food = foodDatabase.find((f) => f.id === foodId);
    if (!food || !user) return;

    try {
      const selectedDateObj = new Date(selectedDate);
      const currentRecord = getDayRecord(selectedDate);

      // 데이터베이스에 저장
      const { error } = await supabase.from("daily_records").insert({
        user_id: user.id,
        record_date: selectedDateObj.toISOString().split("T")[0],
        meal_type: meal,
        food_name: food.name,
        protein_amount: food.protein,
        is_workout_day: currentRecord.isWorkoutDay,
      });

      if (error) throw error;

      // 로컬 상태 업데이트
      const updatedRecords = { ...dailyRecords };
      if (!updatedRecords[selectedDate]) {
        updatedRecords[selectedDate] = {
          breakfast: [],
          lunch: [],
          dinner: [],
          isWorkoutDay: false,
        };
      }

      updatedRecords[selectedDate][meal].push({
        id: Date.now(),
        name: food.name,
        protein: food.protein,
      });

      setDailyRecords(updatedRecords);
    } catch (error) {
      console.error("Error adding food:", error);
      alert("음식 추가 중 오류가 발생했습니다.");
    }
  };

  // 음식 삭제
  const removeFoodFromMeal = async (
    meal: "breakfast" | "lunch" | "dinner",
    foodId: number
  ): Promise<void> => {
    if (!user) return;

    try {
      const updatedRecords = { ...dailyRecords };
      if (updatedRecords[selectedDate]) {
        updatedRecords[selectedDate][meal] = updatedRecords[selectedDate][
          meal
        ].filter((food) => food.id !== foodId);
        setDailyRecords(updatedRecords);
      }
    } catch (error) {
      console.error("Error removing food:", error);
    }
  };

  // 운동 여부 토글
  const toggleWorkoutDay = async (): Promise<void> => {
    if (!user) return;

    const updatedRecords = { ...dailyRecords };
    if (!updatedRecords[selectedDate]) {
      updatedRecords[selectedDate] = {
        breakfast: [],
        lunch: [],
        dinner: [],
        isWorkoutDay: false,
      };
    }
    updatedRecords[selectedDate].isWorkoutDay =
      !updatedRecords[selectedDate].isWorkoutDay;
    setDailyRecords(updatedRecords);
  };

  // 체중 업데이트 (실제 저장)
  const updateBodyWeight = async (newWeight: number): Promise<void> => {
    if (!user || newWeight <= 0) return;

    try {
      // RLS 설정
      await supabase.rpc("set_config", {
        setting_name: "app.current_user_id",
        setting_value: user.id,
        is_local: true,
      });

      const { error } = await supabase
        .from("user_profiles")
        .update({ body_weight: newWeight })
        .eq("id", user.id);

      if (error) throw error;
      setBodyWeight(newWeight);
      setTempBodyWeight(String(newWeight));
    } catch (error) {
      console.error("Error updating body weight:", error);
      // 에러 발생시 원래 값으로 복원
      setTempBodyWeight(String(bodyWeight));
    }
  };

  // 체중 입력 완료 처리
  const handleBodyWeightSubmit = (): void => {
    const newWeight = parseFloat(tempBodyWeight);
    if (isNaN(newWeight) || newWeight <= 0) {
      // 잘못된 입력시 원래 값으로 복원
      setTempBodyWeight(String(bodyWeight));
      alert("올바른 체중을 입력해주세요.");
      return;
    }
    updateBodyWeight(newWeight);
  };

  // 음식 데이터베이스에 새 음식 추가
  const addNewFood = async (): Promise<void> => {
    if (!newFood.name || !newFood.protein || !user) return;

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
    } catch (error) {
      console.error("Error adding food:", error);
      alert("음식 추가 중 오류가 발생했습니다.");
    }
  };

  // 음식 삭제 (데이터베이스에서)
  const deleteFood = async (id: number): Promise<void> => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("food_database")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      setFoodDatabase(foodDatabase.filter((food) => food.id !== id));
    } catch (error) {
      console.error("Error deleting food:", error);
    }
  };

  // 음식 수정
  const updateFood = async (
    id: number,
    updatedFood: Partial<FoodItem>
  ): Promise<void> => {
    if (!user) return;

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
    } catch (error) {
      console.error("Error updating food:", error);
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

  // 로딩 화면
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 로그인하지 않은 경우
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Protein Tracker
            </h1>
            <p className="text-gray-600">
              {authMode === "login"
                ? "아이디로 로그인하여 단백질 섭취량을 기록하세요"
                : "새 계정을 만들어 단백질 관리를 시작하세요"}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">아이디</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="영문, 숫자, 밑줄(_) 사용 가능"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="6자 이상 입력하세요"
              />
            </div>

            {authMode === "signup" && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="비밀번호를 다시 입력하세요"
                />
              </div>
            )}

            <div className="flex gap-2">
              {authMode === "login" ? (
                <>
                  <button
                    onClick={handleLogin}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium"
                  >
                    로그인
                  </button>
                  <button
                    onClick={() => setAuthMode("signup")}
                    className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium"
                  >
                    회원가입
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setAuthMode("login")}
                    className="flex-1 bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 font-medium"
                  >
                    로그인으로
                  </button>
                  <button
                    onClick={handleSignup}
                    className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium"
                  >
                    가입하기
                  </button>
                </>
              )}
            </div>

            <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h3 className="font-medium text-yellow-800 mb-2">🎯 주요 기능</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>📅 달력으로 일일 기록 관리</li>
                <li>🍽️ 식사별 단백질 섭취량 추적</li>
                <li>💪 운동일/비운동일 구분</li>
                <li>🧮 단백질 계산기</li>
                <li>📊 목표 달성률 시각화</li>
              </ul>

              {authMode === "signup" && (
                <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                  <p className="text-xs text-blue-600">
                    💡 <strong>아이디 규칙:</strong> 영문, 숫자, 밑줄(_)만 사용
                    가능하며 3자 이상이어야 합니다.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentRecord = getDayRecord(selectedDate);
  const totalProtein = getTotalProtein(selectedDate);
  const targetProtein = getTargetProtein(currentRecord.isWorkoutDay);
  const progressPercentage = Math.min(
    (totalProtein / targetProtein) * 100,
    100
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
              <Calendar className="text-blue-600" />
              Protein Tracker
            </h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User size={16} />
                {userDisplayName || "Loading..."}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCalculator(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  <Calculator size={20} />
                  계산기
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Settings size={20} />
                  설정
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  <LogOut size={20} />
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 달력 */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">
                {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setCurrentDate(
                      new Date(
                        currentDate.getFullYear(),
                        currentDate.getMonth() - 1
                      )
                    )
                  }
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                >
                  이전
                </button>
                <button
                  onClick={() =>
                    setCurrentDate(
                      new Date(
                        currentDate.getFullYear(),
                        currentDate.getMonth() + 1
                      )
                    )
                  }
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                >
                  다음
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-4">
              {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                <div
                  key={day}
                  className="text-center font-semibold text-gray-600 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {generateCalendar(currentDate).map((date, index) => {
                if (!date) return <div key={index} className="h-16"></div>;

                const dateString = date.toDateString();
                const dayTotal = getTotalProtein(dateString);
                const dayRecord = getDayRecord(dateString);
                const dayTarget = getTargetProtein(dayRecord.isWorkoutDay);
                const isSelected = dateString === selectedDate;
                const isToday = dateString === new Date().toDateString();

                return (
                  <div
                    key={dateString}
                    onClick={() => setSelectedDate(dateString)}
                    className={`h-16 border-2 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : isToday
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="p-1 h-full flex flex-col justify-between">
                      <div className="text-sm font-medium">
                        {date.getDate()}
                      </div>
                      {dayTotal > 0 && (
                        <div className="text-xs">
                          <div
                            className={`text-center ${
                              dayTotal >= dayTarget
                                ? "text-green-600"
                                : "text-orange-600"
                            }`}
                          >
                            {dayTotal.toFixed(0)}g
                          </div>
                          {dayRecord.isWorkoutDay && (
                            <div className="w-2 h-2 bg-red-500 rounded-full mx-auto"></div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 일일 기록 */}
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
                  onChange={toggleWorkoutDay}
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
                  <span className="text-green-600 font-semibold">
                    목표 달성! 🎉
                  </span>
                ) : (
                  <span className="text-orange-600">
                    {(targetProtein - totalProtein).toFixed(1)}g 부족
                  </span>
                )}
              </div>
            </div>

            {/* 식사별 기록 */}
            {(["breakfast", "lunch", "dinner"] as const).map((meal, idx) => {
              const mealNames = ["아침", "점심", "저녁"];
              const mealTotal = currentRecord[meal].reduce(
                (sum, food) => sum + food.protein,
                0
              );

              return (
                <div key={meal} className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">{mealNames[idx]}</h4>
                    <span className="text-sm text-gray-600">
                      {mealTotal.toFixed(1)}g
                    </span>
                  </div>

                  <div className="space-y-1 mb-2">
                    {currentRecord[meal].map((food) => (
                      <div
                        key={food.id}
                        className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded"
                      >
                        <span>{food.name}</span>
                        <div className="flex items-center gap-2">
                          <span>{food.protein}g</span>
                          <button
                            onClick={() => removeFoodFromMeal(meal, food.id)}
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
                        addFoodToMeal(meal, parseInt(e.target.value));
                        e.target.value = "";
                      }
                    }}
                    className="w-full p-2 text-sm border rounded-lg"
                  >
                    <option value="">음식 추가...</option>
                    {foodDatabase.map((food) => (
                      <option key={food.id} value={food.id}>
                        {food.name} ({food.protein}g)
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>

        {/* 설정 모달 */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">설정</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  체중 (kg)
                </label>
                <input
                  type="number"
                  value={tempBodyWeight}
                  onChange={(e) => setTempBodyWeight(e.target.value)}
                  onBlur={handleBodyWeightSubmit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleBodyWeightSubmit();
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

              <div className="mb-4">
                <h4 className="font-medium mb-2">나만의 음식 추가</h4>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="음식 이름"
                    value={newFood.name}
                    onChange={(e) =>
                      setNewFood({ ...newFood, name: e.target.value })
                    }
                    className="flex-1 p-2 text-sm border rounded"
                  />
                  <input
                    type="number"
                    placeholder="단백질(g)"
                    value={newFood.protein}
                    onChange={(e) =>
                      setNewFood({ ...newFood, protein: e.target.value })
                    }
                    className="w-20 p-2 text-sm border rounded"
                  />
                  <button
                    onClick={addNewFood}
                    className="px-3 py-2 bg-blue-500 text-white rounded text-sm"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {foodDatabase
                    .filter((food) => food.user_id === user?.id)
                    .map((food) => (
                      <div
                        key={food.id}
                        className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded"
                      >
                        {editingFood === food.id ? (
                          <div className="flex gap-2 flex-1">
                            <input
                              type="text"
                              defaultValue={food.name}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const target = e.target as HTMLInputElement;
                                  updateFood(food.id, { name: target.value });
                                }
                              }}
                              className="flex-1 p-1 text-xs border rounded"
                            />
                            <input
                              type="number"
                              defaultValue={food.protein}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const target = e.target as HTMLInputElement;
                                  updateFood(food.id, {
                                    protein: parseFloat(target.value),
                                  });
                                }
                              }}
                              className="w-16 p-1 text-xs border rounded"
                            />
                            <button
                              onClick={() => setEditingFood(null)}
                              className="text-green-500"
                            >
                              <Check size={14} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span>
                              {food.name} ({food.protein}g)
                            </span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => setEditingFood(food.id)}
                                className="text-blue-500"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => deleteFood(food.id)}
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
        )}

        {/* 계산기 모달 */}
        {showCalculator && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">단백질 계산기</h3>
                <button
                  onClick={() => setShowCalculator(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    음식명
                  </label>
                  <input
                    type="text"
                    value={calcFood}
                    onChange={(e) => setCalcFood(e.target.value)}
                    placeholder="예: 닭가슴살"
                    className="w-full p-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    양 (g 또는 개)
                  </label>
                  <input
                    type="number"
                    value={calcAmount}
                    onChange={(e) => setCalcAmount(e.target.value)}
                    placeholder="예: 150"
                    className="w-full p-2 border rounded-lg"
                  />
                </div>

                <button
                  onClick={calculateProtein}
                  className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  계산하기
                </button>

                {calcResult && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">
                      계산 결과
                    </h4>
                    <p className="text-sm">
                      <strong>{calcResult.food}</strong> 기준으로
                      <br />
                      <strong>{calcResult.amount}g</strong>에는 약{" "}
                      <strong>{calcResult.protein}g</strong>의 단백질이
                      있습니다.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProteinTracker;
