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

// Types

// 상태 타입 정의
interface DateState {
  current: Date;
  selected: string;
}

interface ModalState {
  settings: boolean;
  calculator: boolean;
}

interface DirectInputState {
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
}

interface DirectInputData {
  breakfast: { name: string; protein: string };
  lunch: { name: string; protein: string };
  dinner: { name: string; protein: string };
}

const ProteinTracker: React.FC = () => {
  // 날짜 상태 통합
  const [dateState, setDateState] = useState<DateState>({
    current: new Date(),
    selected: new Date().toDateString(),
  });

  // 모달 상태 통합
  const [modalState, setModalState] = useState<ModalState>({
    settings: false,
    calculator: false,
  });

  // 직접 입력 모드 상태
  const [directInputMode, setDirectInputMode] = useState<DirectInputState>({
    breakfast: false,
    lunch: false,
    dinner: false,
  });

  // 직접 입력 데이터
  const [directInputData, setDirectInputData] = useState<DirectInputData>({
    breakfast: { name: "", protein: "" },
    lunch: { name: "", protein: "" },
    dinner: { name: "", protein: "" },
  });

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

  // 날짜 관련 핸들러
  const handleDateChange = (newDate: Date) => {
    setDateState((prev) => ({ ...prev, current: newDate }));
  };

  const handleDateSelect = (dateString: string) => {
    setDateState((prev) => ({ ...prev, selected: dateString }));
  };

  // 모달 관련 핸들러
  const openModal = (modalName: keyof ModalState) => {
    setModalState((prev) => ({ ...prev, [modalName]: true }));
  };

  const closeModal = (modalName: keyof ModalState) => {
    setModalState((prev) => ({ ...prev, [modalName]: false }));
  };

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

  // 직접 입력으로 음식 추가하는 함수
  const addDirectFood = async (meal: "breakfast" | "lunch" | "dinner") => {
    const inputData = directInputData[meal];

    if (!inputData.name || !inputData.protein) {
      alert("음식명과 단백질량을 모두 입력해주세요.");
      return;
    }

    const proteinAmount = parseFloat(inputData.protein);
    if (isNaN(proteinAmount) || proteinAmount <= 0) {
      alert("올바른 단백질량을 입력해주세요.");
      return;
    }

    const success = await dailyRecords.addDirectFoodToMeal(
      meal,
      inputData.name,
      proteinAmount,
      dateState.selected
    );

    if (success) {
      // 입력 필드 초기화
      setDirectInputData((prev) => ({
        ...prev,
        [meal]: { name: "", protein: "" },
      }));

      // 직접 입력 모드 해제
      setDirectInputMode((prev) => ({
        ...prev,
        [meal]: false,
      }));
    }
  };

  // Enter 키 처리 함수
  const handleDirectInputKeyDown = (
    e: React.KeyboardEvent,
    meal: "breakfast" | "lunch" | "dinner"
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addDirectFood(meal);
    }
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
  const currentRecord = dailyRecords.getDayRecord(dateState.selected);
  const totalProtein = dailyRecords.getTotalProtein(dateState.selected);
  const targetProtein = bodyWeight.getTargetProtein(
    currentRecord.hasCardio,
    currentRecord.hasStrength
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <Header
          userDisplayName={auth.userDisplayName}
          onSettingsClick={() => openModal("settings")}
          onLogoutClick={handleLogout}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 달력 */}
          <CalendarView
            currentDate={dateState.current}
            selectedDate={dateState.selected}
            dailyRecords={dailyRecords.dailyRecords}
            bodyWeight={bodyWeight.bodyWeight}
            getTargetProtein={bodyWeight.getTargetProtein}
            onDateChange={handleDateChange}
            onDateSelect={handleDateSelect}
          />

          {/* 일일 기록 */}
          <DailyRecordPanel
            selectedDate={dateState.selected}
            currentRecord={currentRecord}
            totalProtein={totalProtein}
            targetProtein={targetProtein}
            foodDatabase={food.foodDatabase}
            directInputMode={directInputMode}
            directInputData={directInputData}
            onToggleCardio={() => dailyRecords.toggleCardio(dateState.selected)}
            onToggleStrength={() =>
              dailyRecords.toggleStrength(dateState.selected)
            }
            onAddFood={(meal, foodId) =>
              dailyRecords.addFoodToMeal(meal, foodId, dateState.selected)
            }
            onRemoveFood={(meal, foodId) =>
              dailyRecords.removeFoodFromMeal(meal, foodId, dateState.selected)
            }
            onDirectInputModeChange={setDirectInputMode}
            onDirectInputDataChange={setDirectInputData}
            onAddDirectFood={addDirectFood}
            onDirectInputKeyDown={handleDirectInputKeyDown}
          />
        </div>

        {/* 설정 모달 */}
        <SettingsModal
          isOpen={modalState.settings}
          onClose={() => closeModal("settings")}
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
