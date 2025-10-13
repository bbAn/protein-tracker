import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { SupabaseUser, AuthMode } from "../types";
import {
  MIN_PASSWORD_LENGTH,
  MIN_USERNAME_LENGTH,
  USERNAME_REGEX,
} from "../constants";

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

  // 초기 사용자 체크 - Supabase Auth 세션 사용
  useEffect(() => {
    const checkUser = async (): Promise<void> => {
      try {
        // Supabase 세션 확인
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);

          // user_profiles에서 username 가져오기
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("username")
            .eq("auth_id", session.user.id)
            .single();

          if (profile?.username) {
            setUserDisplayName(profile.username);
          }
        }
      } catch (error) {
        console.error("Error checking user:", error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // 인증 상태 변경 리스너
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        // username 가져오기
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("username")
          .eq("auth_id", session.user.id)
          .single();

        if (profile?.username) {
          setUserDisplayName(profile.username);
        }
      } else {
        setUserDisplayName("");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 로그인 - Supabase Auth 사용
  const handleLogin = async (): Promise<{ success: boolean; user?: User }> => {
    if (!username || !password) {
      alert("아이디와 비밀번호를 입력해주세요.");
      return { success: false };
    }

    try {
      // username을 email 형식으로 변환 (Supabase는 email 기반 인증만 지원)
      const email = `${username.toLowerCase()}@protein.app`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login error:", error);
        if (error.message.includes("Invalid login credentials")) {
          alert("아이디 또는 비밀번호가 잘못되었습니다.");
        } else {
          alert("로그인 중 오류가 발생했습니다.");
        }
        return { success: false };
      }

      if (data.user) {
        // user_profiles에서 username과 id 가져오기
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("id, username")
          .eq("auth_id", data.user.id)
          .single();

        if (profile) {
          const userInfo: User = {
            id: profile.id,
            username: profile.username,
          };

          setUser(data.user);
          setUserDisplayName(profile.username);
          setUsername("");
          setPassword("");

          return { success: true, user: userInfo };
        }
      }

      return { success: false };
    } catch (error) {
      console.error("Login catch error:", error);
      alert("로그인 중 오류가 발생했습니다.");
      return { success: false };
    }
  };

  // 회원가입 - Supabase Auth 사용
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
      // 1. username 중복 확인
      const { data: existingUser } = await supabase
        .from("user_profiles")
        .select("username")
        .eq("username", username.toLowerCase())
        .single();

      if (existingUser) {
        alert("이미 사용 중인 아이디입니다.");
        return false;
      }

      // 2. Supabase Auth로 회원가입
      const email = `${username.toLowerCase()}@protein.app`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.toLowerCase(),
          },
          // 이메일 확인 건너뛰기 (개발용)
          emailRedirectTo: undefined,
        },
      });

      if (error) {
        console.error("Signup error:", error);
        if (error.message.includes("already registered")) {
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

  // 로그아웃 - Supabase Auth 사용
  const handleLogout = async (): Promise<void> => {
    await supabase.auth.signOut();
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