"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Settings,
  // Calculator,
  Trash2,
  X,
  LogOut,
  User,
} from "lucide-react";

// Hooks
import { useAuth } from "./hooks/useAuth";
import { useFood } from "./hooks/useFood";
import { useDailyRecords } from "./hooks/useDailyRecords";
import { useBodyWeight } from "./hooks/useBodyWeight";

// Components
import { AuthForm } from "./components/auth/AuthForm";

// Utils
import { generateCalendar, dateKeyToDateString } from "./utils/dateUtils";

// Constants
import { MEAL_NAMES, DAY_NAMES, PROTEIN_GOALS } from "./constants";
import { ProteinGoal } from "./types";

const ProteinTracker: React.FC = () => {
  // 상태
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toDateString()
  );
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showCalculator, setShowCalculator] = useState<boolean>(false);

  // 커스텀 훅들
  const auth = useAuth();
  const bodyWeight = useBodyWeight(auth.user);
  const food = useFood(auth.user);
  const dailyRecords = useDailyRecords(auth.user, food.foodDatabase);

  // 사용자 데이터 로드
  useEffect(() => {
    if (auth.user) {
      Promise.all([
        bodyWeight.loadUserProfile(auth.user.id),
        food.loadFoodDatabase(auth.user.id),
        dailyRecords.loadDailyRecords(auth.user.id),
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user]);

  // 로그인 처리
  const handleLogin = async () => {
    const result = await auth.handleLogin();
    if (result.success && result.user) {
      // 사용자 데이터 자동 로드는 useEffect에서 처리됨
    }
    return result;
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    await auth.handleLogout();
    bodyWeight.resetBodyWeight();
  };

  // 로딩 화면
  if (auth.loading) {
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
  if (!auth.user) {
    return (
      <AuthForm
        username={auth.username}
        password={auth.password}
        confirmPassword={auth.confirmPassword}
        authMode={auth.authMode}
        onUsernameChange={auth.setUsername}
        onPasswordChange={auth.setPassword}
        onConfirmPasswordChange={auth.setConfirmPassword}
        onAuthModeChange={auth.setAuthMode}
        onLogin={handleLogin}
        onSignup={auth.handleSignup}
      />
    );
  }

  // 현재 선택된 날짜의 기록과 통계
  const currentRecord = dailyRecords.getDayRecord(selectedDate);
  const totalProtein = dailyRecords.getTotalProtein(selectedDate);
  const targetProtein = bodyWeight.getTargetProtein(currentRecord.isWorkoutDay);
  const progressPercentage = Math.min(
    (totalProtein / targetProtein) * 100,
    100
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2 mb-6">
              <Calendar className="text-blue-600" />
              Protein Tracker
            </h1>
            <div className="flex items-center justify-end gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User size={16} />
                {auth.userDisplayName || "Loading..."}
              </div>
              <div className="flex gap-2">
                {/* <button
                  onClick={() => setShowCalculator(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  <Calculator size={20} />
                  계산기
                </button> */}
                <button
                  onClick={() => setShowSettings(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Settings size={20} />
                  {/* 설정 */}
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  <LogOut size={20} />
                  {/* 로그아웃 */}
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
              {DAY_NAMES.map((day) => (
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
                if (!date) return <div key={index} className="h-14"></div>;

                const dateString = date.toDateString();
                const dayTotal = dailyRecords.getTotalProtein(dateString);
                const dayRecord = dailyRecords.getDayRecord(dateString);
                const dayTarget = bodyWeight.getTargetProtein(
                  dayRecord.isWorkoutDay
                );
                const isSelected = dateString === selectedDate;
                const isToday = dateString === new Date().toDateString();

                return (
                  <div
                    key={dateString}
                    onClick={() => setSelectedDate(dateString)}
                    className={`h-14 border-2 rounded-lg cursor-pointer transition-all ${
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
                  onChange={() => dailyRecords.toggleWorkoutDay(selectedDate)}
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
                <div>
                  💪 운동한 날: {currentRecord.isWorkoutDay ? "✅" : "❌"}
                </div>
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
                    <h4 className="font-medium">{MEAL_NAMES[meal]}</h4>
                    <span className="text-sm text-gray-600">
                      {mealTotal.toFixed(1)}g
                    </span>
                  </div>

                  <div className="space-y-1 mb-2">
                    {currentRecord[meal].map((foodItem) => (
                      <div
                        key={foodItem.id}
                        className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded"
                      >
                        <span>{foodItem.name}</span>
                        <div className="flex items-center gap-2">
                          <span>{foodItem.protein}g</span>
                          <button
                            onClick={() =>
                              dailyRecords.removeFoodFromMeal(
                                meal,
                                foodItem.id,
                                selectedDate
                              )
                            }
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
                        dailyRecords.addFoodToMeal(
                          meal,
                          parseInt(e.target.value),
                          selectedDate
                        );
                        e.target.value = "";
                      }
                    }}
                    className="w-full p-2 text-sm border rounded-lg"
                  >
                    <option value="">음식 추가...</option>
                    {food.foodDatabase
                      .sort((a, b) => a.name.localeCompare(b.name)) // 오름차순 정렬 추가
                      .map((foodItem) => (
                        <option key={foodItem.id} value={foodItem.id}>
                          {foodItem.name} ({foodItem.protein}g)
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
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">설정</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>

              {/* 단백질 목적 설정 */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-3">
                  단백질 섭취 목적
                </label>
                <div className="space-y-3">
                  {Object.entries(PROTEIN_GOALS).map(([key, goal]) => (
                    <div
                      key={key}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        bodyWeight.proteinGoal === key
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() =>
                        bodyWeight.updateProteinGoal(key as ProteinGoal)
                      }
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
                            운동: {goal.workout}g/kg
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 체중 설정 */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  체중 (kg)
                </label>
                <input
                  type="number"
                  value={bodyWeight.tempBodyWeight}
                  onChange={(e) => bodyWeight.setTempBodyWeight(e.target.value)}
                  onBlur={bodyWeight.handleBodyWeightSubmit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      bodyWeight.handleBodyWeightSubmit();
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
                    {bodyWeight.getProteinMultipliers().goalIcon} 현재 설정:{" "}
                    {bodyWeight.getProteinMultipliers().goalName}
                  </div>
                  <div className="text-xs text-gray-600 mb-2">
                    {bodyWeight.getProteinMultipliers().description}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      일반:{" "}
                      <strong>
                        {(
                          bodyWeight.bodyWeight *
                          bodyWeight.getProteinMultipliers().normal
                        ).toFixed(0)}
                        g
                      </strong>
                    </span>
                    <span className="text-gray-600">
                      운동:{" "}
                      <strong>
                        {(
                          bodyWeight.bodyWeight *
                          bodyWeight.getProteinMultipliers().workout
                        ).toFixed(0)}
                        g
                      </strong>
                    </span>
                  </div>
                </div>

                <p className="text-xs text-blue-600 mt-2">
                  💡 입력 후 엔터키를 누르거나 다른 곳을 클릭하면 저장됩니다.
                </p>
              </div>

              {/* 닫기 버튼 */}
              <div className="flex justify-end">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  닫기
                </button>
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
                    value={food.calcFood}
                    onChange={(e) => food.setCalcFood(e.target.value)}
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
                    value={food.calcAmount}
                    onChange={(e) => food.setCalcAmount(e.target.value)}
                    placeholder="예: 150"
                    className="w-full p-2 border rounded-lg"
                  />
                </div>

                <button
                  onClick={food.calculateProtein}
                  className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  계산하기
                </button>

                {food.calcResult && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">
                      계산 결과
                    </h4>
                    <p className="text-sm">
                      <strong>{food.calcResult.food}</strong> 기준으로
                      <br />
                      <strong>{food.calcResult.amount}g</strong>에는 약{" "}
                      <strong>{food.calcResult.protein}g</strong>의 단백질이
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
