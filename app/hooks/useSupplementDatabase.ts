import { useCallback, useState } from "react";
import { supabase } from "../../lib/supabase";
import { withTimeout } from "../../lib/withTimeout";
import { SupabaseUser, SupplementDatabaseItem } from "../types";

export const useSupplementDatabase = (user: SupabaseUser | null) => {
  const [supplementDatabase, setSupplementDatabase] = useState<
    SupplementDatabaseItem[]
  >([]);
  const [editingSupplement, setEditingSupplement] = useState<number | null>(
    null
  );
  const [newSupplement, setNewSupplement] = useState<{
    name: string;
    quantity: string;
    dosage: string;
  }>({ name: "", quantity: "", dosage: "" });
  const [userProfileId, setUserProfileId] = useState<string | null>(null);

  // user_profiles의 id 가져오기
  const getUserProfileId = useCallback(
    async (authUserId: string): Promise<string | null> => {
      if (userProfileId) return userProfileId;

      try {
        const { data: profile, error } = await withTimeout(
          supabase
            .from("user_profiles")
            .select("id")
            .eq("auth_id", authUserId)
            .single(),
          8000,
          "프로필 조회 요청이 시간 초과됐습니다."
        );

        if (error) throw error;

        if (profile) {
          setUserProfileId(profile.id);
          return profile.id;
        }
      } catch (error) {
        console.error("❌ 프로필 ID 조회 실패:", error);
      }
      return null;
    },
    [userProfileId]
  );

  // 나만의 영양제·건강식품 목록 로드
  const loadSupplementDatabase = useCallback(
    async (authUserId: string) => {
      try {
        const profileId = await getUserProfileId(authUserId);
        if (!profileId) {
          console.error("❌ User profile not found");
          return;
        }

        const { data: supplements, error } = await supabase
          .from("supplement_database")
          .select("*")
          .eq("user_id", profileId);

        if (error) throw error;

        if (supplements) {
          setSupplementDatabase(supplements);
        }
      } catch (error) {
        console.error("❌ 영양제 목록 로드 실패:", error);
      }
    },
    [getUserProfileId]
  );

  // 새 영양제 추가
  const addNewSupplement = async (): Promise<boolean> => {
    if (!newSupplement.name) {
      alert("품목명을 입력해주세요.");
      return false;
    }

    if (!user) {
      alert("로그인이 필요합니다.");
      return false;
    }

    try {
      const profileId = await getUserProfileId(user.id);
      if (!profileId) {
        alert("사용자 프로필을 찾을 수 없습니다.");
        return false;
      }

      const { data, error } = await supabase
        .from("supplement_database")
        .insert({
          user_id: profileId,
          name: newSupplement.name,
          quantity: newSupplement.quantity || null,
          dosage: newSupplement.dosage || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (!data) {
        throw new Error("영양제가 추가되었지만 데이터가 반환되지 않았습니다.");
      }

      setSupplementDatabase([...supplementDatabase, data]);
      setNewSupplement({ name: "", quantity: "", dosage: "" });
      return true;
    } catch (error) {
      console.error("❌ 영양제 추가 실패:", error);
      alert("영양제 추가 중 오류가 발생했습니다: " + (error as Error)?.message);
      return false;
    }
  };

  // 영양제 삭제
  const deleteSupplement = async (id: number): Promise<boolean> => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return false;
    }

    if (!confirm("이 영양제를 삭제하시겠습니까?")) {
      return false;
    }

    try {
      const profileId = await getUserProfileId(user.id);
      if (!profileId) {
        alert("사용자 프로필을 찾을 수 없습니다.");
        return false;
      }

      const { error } = await supabase
        .from("supplement_database")
        .delete()
        .eq("id", id)
        .eq("user_id", profileId);

      if (error) throw error;

      setSupplementDatabase(
        supplementDatabase.filter((item) => item.id !== id)
      );
      return true;
    } catch (error) {
      console.error("❌ 영양제 삭제 실패:", error);
      alert("영양제 삭제 중 오류가 발생했습니다: " + (error as Error)?.message);
      return false;
    }
  };

  // 영양제 수정
  const updateSupplement = async (
    id: number,
    updatedSupplement: Partial<SupplementDatabaseItem>
  ): Promise<boolean> => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return false;
    }

    try {
      const profileId = await getUserProfileId(user.id);
      if (!profileId) {
        alert("사용자 프로필을 찾을 수 없습니다.");
        return false;
      }

      const { error } = await supabase
        .from("supplement_database")
        .update(updatedSupplement)
        .eq("id", id)
        .eq("user_id", profileId);

      if (error) throw error;

      setSupplementDatabase(
        supplementDatabase.map((item) =>
          item.id === id ? { ...item, ...updatedSupplement } : item
        )
      );
      setEditingSupplement(null);
      return true;
    } catch (error) {
      console.error("❌ 영양제 수정 실패:", error);
      alert("영양제 수정 중 오류가 발생했습니다: " + (error as Error)?.message);
      return false;
    }
  };

  return {
    // 상태
    supplementDatabase,
    editingSupplement,
    newSupplement,

    // 상태 변경
    setEditingSupplement,
    setNewSupplement,

    // 액션
    loadSupplementDatabase,
    addNewSupplement,
    deleteSupplement,
    updateSupplement,
  };
};
