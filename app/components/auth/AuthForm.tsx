import React from "react";
import { AuthMode } from "../../types";

// User 타입 정의
interface User {
  id: string;
  username: string;
  createdAt?: string;
  // 필요에 따라 다른 사용자 정보 필드 추가 가능
}

interface AuthFormProps {
  username: string;
  password: string;
  confirmPassword: string;
  authMode: AuthMode;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onAuthModeChange: (mode: AuthMode) => void;
  onLogin: () => Promise<{ success: boolean; user?: User }>;
  onSignup: () => Promise<boolean>;
}

export const AuthForm: React.FC<AuthFormProps> = ({
  username,
  password,
  confirmPassword,
  authMode,
  onUsernameChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onAuthModeChange,
  onLogin,
  onSignup,
}) => {
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
              onChange={(e) => onUsernameChange(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="영문, 숫자, 밑줄(_) 사용 가능"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
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
                onChange={(e) => onConfirmPasswordChange(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="비밀번호를 다시 입력하세요"
              />
            </div>
          )}

          <div className="flex gap-2">
            {authMode === "login" ? (
              <>
                <button
                  onClick={onLogin}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium"
                >
                  로그인
                </button>
                <button
                  onClick={() => onAuthModeChange("signup")}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium"
                >
                  회원가입
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onAuthModeChange("login")}
                  className="flex-1 bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 font-medium"
                >
                  로그인으로
                </button>
                <button
                  onClick={onSignup}
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
              {/* <li>🧮 단백질 계산기</li> */}
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
};
