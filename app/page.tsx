"use client";

import React, { useEffect, useState } from "react";

// Hooks
import { useAuth } from "./hooks/useAuth";
import { useBodyWeight } from "./hooks/useBodyWeight";
import { useDailyRecords } from "./hooks/useDailyRecords";
import { useFood } from "./hooks/useFood";

// Components
import { AuthForm } from "./components/auth/AuthForm";
import { CalendarView } from "./components/calendar/CalendarView";
import { Header } from "./components/layout/Header";
import { LoadingScreen } from "./components/layout/LoadingScreen";
import { SettingsModal } from "./components/modals/SettingsModal";
import { DailyRecordPanel } from "./components/record/DailyRecordPanel";

const ProteinTracker: React.FC = () => {
  // 상태
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toDateString()
  );
  const [showSettings, setShowSettings] = useState<boolean>(false);

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
    return <LoadingScreen />;
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
  const targetProtein = bodyWeight.getTargetProtein(
    currentRecord.isWorkoutDay,
    false
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <Header
          userDisplayName={auth.userDisplayName}
          onSettingsClick={() => setShowSettings(true)}
          onLogoutClick={handleLogout}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 달력 */}
          <CalendarView
            currentDate={currentDate}
            selectedDate={selectedDate}
            dailyRecords={dailyRecords.dailyRecords}
            bodyWeight={bodyWeight.bodyWeight}
            getTargetProtein={bodyWeight.getTargetProtein}
            onDateChange={setCurrentDate}
            onDateSelect={setSelectedDate}
          />

          {/* 일일 기록 */}
          <DailyRecordPanel
            selectedDate={selectedDate}
            currentRecord={currentRecord}
            totalProtein={totalProtein}
            targetProtein={targetProtein}
            foodDatabase={food.foodDatabase}
            onToggleWorkoutDay={() =>
              dailyRecords.toggleWorkoutDay(selectedDate)
            }
            onAddFood={(meal, foodId) =>
              dailyRecords.addFoodToMeal(meal, foodId, selectedDate)
            }
            onRemoveFood={(meal, foodId) =>
              dailyRecords.removeFoodFromMeal(meal, foodId, selectedDate)
            }
          />
        </div>

        {/* 설정 모달 */}
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          bodyWeight={bodyWeight.bodyWeight}
          tempBodyWeight={bodyWeight.tempBodyWeight}
          onBodyWeightChange={bodyWeight.setTempBodyWeight}
          onBodyWeightSubmit={bodyWeight.handleBodyWeightSubmit}
          foodDatabase={food.foodDatabase}
          newFood={food.newFood}
          editingFood={food.editingFood}
          onNewFoodChange={food.setNewFood}
          onAddFood={food.addNewFood}
          onEditFood={food.setEditingFood}
          onUpdateFood={food.updateFood}
          onDeleteFood={food.deleteFood}
          onStopEditing={() => food.setEditingFood(null)}
        />
      </div>
    </div>
  );
};

export default ProteinTracker;
