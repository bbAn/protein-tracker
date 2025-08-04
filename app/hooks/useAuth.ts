import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { SupabaseUser, AuthMode } from "../types";
import {
  MIN_PASSWORD_LENGTH,
  MIN_USERNAME_LENGTH,
  USERNAME_REGEX,
} from "../constants";

// User 인터페이스 정의 (AuthForm과 일관성 유지)
interface User {
  id: string;
  username: string;
  createdAt?: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userDisplayName, setUserDisplayName] = useState<string>("");

  // 인증 폼 상태
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [authMode, setAuthMode] = useState<AuthMode>("login");

  // 비밀번호 해싱
  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + "protein_salt_2024");
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  // 초기 사용자 체크
  useEffect(() => {
    const checkUser = async (): Promise<User | null> => {
      try {
        const savedUser = sessionStorage.getItem("protein_user");
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          setUser({ id: userData.id } as SupabaseUser);
          setUserDisplayName(userData.username);
          return userData;
        }
      } catch (error) {
        console.error("Error checking user:", error);
      } finally {
        setLoading(false);
      }
      return null;
    };

    checkUser();
  }, []);

  // 로그인
  const handleLogin = async (): Promise<{ success: boolean; user?: User }> => {
    if (!username || !password) {
      alert("아이디와 비밀번호를 입력해주세요.");
      return { success: false };
    }

    try {
      const hashedPassword = await hashPassword(password);

      const { data: loginResult, error } = await supabase.rpc("login_user", {
        p_username: username.toLowerCase(),
        p_password_hash: hashedPassword,
      });

      if (error) {
        console.error("Login error:", error);
        alert("로그인 중 오류가 발생했습니다.");
        return { success: false };
      }

      if (!loginResult || loginResult.length === 0) {
        const { data: userCheck } = await supabase
          .from("user_profiles")
          .select("username")
          .eq("username", username.toLowerCase());

        if (!userCheck || userCheck.length === 0) {
          alert("존재하지 않는 아이디입니다.");
        } else {
          alert("비밀번호가 잘못되었습니다.");
        }
        return { success: false };
      }

      // 로그인 성공
      const userData = loginResult[0];
      const userInfo: User = {
        id: userData.user_id,
        username: userData.username,
      };

      sessionStorage.setItem("protein_user", JSON.stringify(userInfo));
      setUser({ id: userData.user_id } as SupabaseUser);
      setUserDisplayName(userData.username);

      setUsername("");
      setPassword("");

      return { success: true, user: userInfo };
    } catch (error) {
      console.error("Login catch error:", error);
      alert("로그인 중 오류가 발생했습니다.");
      return { success: false };
    }
  };

  // 회원가입
  const handleSignup = async (): Promise<boolean> => {
    if (!username || !password || !confirmPassword) {
      alert("모든 필드를 입력해주세요.");
      return false;
    }

    if (password !== confirmPassword) {
      alert("비밀번호가 일치하지 않습니다.");
      return false;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      alert(`비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`);
      return false;
    }

    if (!USERNAME_REGEX.test(username)) {
      alert("아이디는 영문, 숫자, 밑줄(_)만 사용 가능합니다.");
      return false;
    }

    if (username.length < MIN_USERNAME_LENGTH) {
      alert(`아이디는 ${MIN_USERNAME_LENGTH}자 이상이어야 합니다.`);
      return false;
    }

    try {
      const hashedPassword = await hashPassword(password);

      const { error } = await supabase.rpc("signup_user", {
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
        return false;
      }

      alert("회원가입이 완료되었습니다!");
      setUsername("");
      setPassword("");
      setConfirmPassword("");
      setAuthMode("login");
      return true;
    } catch (signupError) {
      console.error("Signup error:", signupError);
      alert("회원가입 중 오류가 발생했습니다.");
      return false;
    }
  };

  // 로그아웃
  const handleLogout = async (): Promise<void> => {
    sessionStorage.removeItem("protein_user");
    setUser(null);
    setUserDisplayName("");
  };

  return {
    // 상태
    user,
    loading,
    userDisplayName,
    username,
    password,
    confirmPassword,
    authMode,

    // 상태 변경 함수
    setUsername,
    setPassword,
    setConfirmPassword,
    setAuthMode,
    setUserDisplayName,

    // 액션 함수
    handleLogin,
    handleSignup,
    handleLogout,
  };
};
