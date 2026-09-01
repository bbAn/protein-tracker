import { Check, Edit, Plus, Trash2, X } from 'lucide-react';
import React from 'react';
import { SupplementDatabaseItem } from '../../types';

interface FoodItem {
  id: number;
  user_id?: string;
  name: string;
  protein: number;
  is_default?: boolean;
  created_at?: string;
}

interface ProteinGoalConfig {
  name: string;
  icon: string;
  description: string;
  normal: number;
  workout: number;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bodyWeight: number;
  tempBodyWeight: string;
  gender: 'male' | 'female';
  proteinGoal: string;
  proteinGoals: Record<string, Record<string, ProteinGoalConfig>>;
  onBodyWeightChange: (value: string) => void;
  onBodyWeightSubmit: () => void;
  onGenderChange: (gender: 'male' | 'female') => void;
  onProteinGoalChange: (goal: string) => void;
  getProteinMultipliers: () => ProteinGoalConfig;
  foodDatabase: FoodItem[];
  newFood: { name: string; protein: string };
  editingFood: number | null;
  onNewFoodChange: (newFood: { name: string; protein: string }) => void;
  onAddFood: () => void;
  onEditFood: (id: number) => void;
  onUpdateFood: (
    id: number,
    updates: { name?: string; protein?: number },
  ) => void;
  onDeleteFood: (id: number) => void;
  onStopEditing: () => void;
  supplementDatabase: SupplementDatabaseItem[];
  newSupplement: { name: string; quantity: string; dosage: string };
  editingSupplement: number | null;
  onNewSupplementChange: (newSupplement: {
    name: string;
    quantity: string;
    dosage: string;
  }) => void;
  onAddSupplement: () => void;
  onEditSupplement: (id: number) => void;
  onUpdateSupplement: (
    id: number,
    updates: { name?: string; quantity?: string; dosage?: string },
  ) => void;
  onDeleteSupplement: (id: number) => void;
  onStopEditingSupplement: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  bodyWeight,
  tempBodyWeight,
  gender,
  proteinGoal,
  proteinGoals,
  onBodyWeightChange,
  onBodyWeightSubmit,
  onGenderChange,
  onProteinGoalChange,
  getProteinMultipliers,
  foodDatabase,
  newFood,
  editingFood,
  onNewFoodChange,
  onAddFood,
  onEditFood,
  onUpdateFood,
  onDeleteFood,
  onStopEditing,
  supplementDatabase,
  newSupplement,
  editingSupplement,
  onNewSupplementChange,
  onAddSupplement,
  onEditSupplement,
  onUpdateSupplement,
  onDeleteSupplement,
  onStopEditingSupplement,
}) => {
  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50'>
      <div className='bg-surface rounded-xl border border-border max-w-md w-full mx-4 max-h-[80vh] flex flex-col'>
        <div className='flex justify-between items-center px-6 pt-6 pb-4 border-b border-border shrink-0'>
          <h3 className='text-lg font-semibold text-foreground'>설정</h3>
          <button
            onClick={onClose}
            className='text-muted hover:text-foreground'
          >
            <X size={20} />
          </button>
        </div>

        <div className='overflow-y-auto px-6 py-6'>
          {/* 성별 선택 */}
          <div className='mb-6'>
            <label className='block text-sm font-medium mb-3 text-foreground'>
              성별
            </label>
            <div className='flex gap-3'>
              <button
                onClick={() => onGenderChange('male')}
                className={`flex-1 p-3 rounded-lg border transition-colors ${
                  gender === 'male'
                    ? 'border-accent bg-accent/5 text-accent'
                    : 'border-border hover:bg-muted-bg'
                }`}
              >
                <div className='text-2xl mb-1'>👨</div>
                <div className='font-medium'>남자</div>
              </button>
              <button
                onClick={() => onGenderChange('female')}
                className={`flex-1 p-3 rounded-lg border transition-colors ${
                  gender === 'female'
                    ? 'border-accent bg-accent/5 text-accent'
                    : 'border-border hover:bg-muted-bg'
                }`}
              >
                <div className='text-2xl mb-1'>👩</div>
                <div className='font-medium'>여자</div>
              </button>
            </div>
          </div>

          {/* 단백질 목적 설정 */}
          <div className='mb-6'>
            <label className='block text-sm font-medium mb-3 text-foreground'>
              단백질 섭취 목적
            </label>
            <div className='space-y-3'>
              {Object.entries(proteinGoals[gender]).map(([key, goal]) => (
                <div
                  key={key}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    proteinGoal === key
                      ? 'border-accent bg-accent/5'
                      : 'border-border hover:bg-muted-bg'
                  }`}
                  onClick={() => onProteinGoalChange(key)}
                >
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <span className='text-lg'>{goal.icon}</span>
                      <div>
                        <div className='font-medium text-foreground'>
                          {goal.name}
                        </div>
                        <div className='text-xs text-muted'>
                          {goal.description}
                        </div>
                      </div>
                    </div>
                    <div className='text-right'>
                      <div className='text-xs text-muted'>
                        일반: {goal.normal}g/kg
                      </div>
                      <div className='text-xs text-muted'>
                        운동시: {goal.workout}g/kg
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 체중 설정 */}
          <div className='mb-6'>
            <label className='block text-sm font-medium mb-2 text-foreground'>
              체중 (kg)
            </label>
            <input
              type='number'
              value={tempBodyWeight}
              onChange={(e) => onBodyWeightChange(e.target.value)}
              onBlur={onBodyWeightSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onBodyWeightSubmit();
                }
              }}
              className='w-full p-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent'
              placeholder='체중을 입력하세요'
              min='1'
              step='0.1'
            />

            {/* 현재 설정에 따른 단백질 목표량 표시 */}
            <div className='mt-2 p-3 bg-muted-bg rounded-lg'>
              <div className='text-sm font-medium text-foreground mb-1'>
                {getProteinMultipliers().icon} 현재 설정:{' '}
                {getProteinMultipliers().name}
              </div>
              <div className='text-xs text-muted mb-2'>
                {getProteinMultipliers().description}
              </div>
              <div className='flex justify-between text-sm'>
                <span className='text-muted'>
                  일반:{' '}
                  <strong className='text-foreground'>
                    {(bodyWeight * getProteinMultipliers().normal).toFixed(0)}g
                  </strong>
                </span>
                <span className='text-muted'>
                  운동시:{' '}
                  <strong className='text-foreground'>
                    {(bodyWeight * getProteinMultipliers().workout).toFixed(0)}g
                  </strong>
                </span>
              </div>
            </div>

            <p className='text-xs text-muted mt-2'>
              💡 입력 후 엔터키를 누르거나 다른 곳을 클릭하면 저장됩니다.
            </p>
          </div>

          {/* 나만의 음식 관리 */}
          <div className='mb-6'>
            <h4 className='font-medium mb-3 text-foreground'>
              나만의 음식 관리
            </h4>

            {/* 새 음식 추가 */}
            <div className='flex gap-2 mb-3'>
              <input
                type='text'
                placeholder='음식 이름 (예: 닭가슴살 150g)'
                value={newFood.name}
                onChange={(e) =>
                  onNewFoodChange({ ...newFood, name: e.target.value })
                }
                className='flex-1 p-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-accent'
              />
              <input
                type='number'
                step='0.1'
                placeholder='단백질(g)'
                value={newFood.protein}
                onChange={(e) =>
                  onNewFoodChange({ ...newFood, protein: e.target.value })
                }
                className='w-24 p-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-accent'
              />
              <button
                onClick={onAddFood}
                disabled={!newFood.name || !newFood.protein}
                className='px-3 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:bg-muted-bg-hover disabled:text-muted disabled:cursor-not-allowed'
              >
                <Plus size={16} />
              </button>
            </div>

            {/* 내가 추가한 음식 목록 */}
            <div className='space-y-2 max-h-40 overflow-y-auto'>
              {foodDatabase
                .filter((foodItem) => !foodItem.is_default)
                .map((foodItem) => (
                  <div
                    key={foodItem.id}
                    className='flex justify-between items-center text-sm bg-muted-bg p-2 rounded-lg'
                  >
                    {editingFood === foodItem.id ? (
                      // 편집 모드
                      <div className='flex gap-2 flex-1'>
                        <input
                          type='text'
                          defaultValue={foodItem.name}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const target = e.target as HTMLInputElement;
                              onUpdateFood(foodItem.id, { name: target.value });
                            }
                          }}
                          className='flex-1 p-1 text-xs border border-border rounded focus:ring-1 focus:ring-accent'
                        />
                        <input
                          type='number'
                          step='0.1'
                          defaultValue={foodItem.protein}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const target = e.target as HTMLInputElement;
                              onUpdateFood(foodItem.id, {
                                protein: parseFloat(target.value),
                              });
                            }
                          }}
                          className='w-16 p-1 text-xs border border-border rounded focus:ring-1 focus:ring-accent'
                        />
                        <button
                          onClick={onStopEditing}
                          className='text-success hover:opacity-80'
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    ) : (
                      // 보기 모드
                      <>
                        <span className='flex-1 text-foreground'>
                          {foodItem.name} ({foodItem.protein}g)
                        </span>
                        <div className='flex gap-1'>
                          <button
                            onClick={() => onEditFood(foodItem.id)}
                            className='text-muted hover:text-accent p-1'
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            onClick={() => onDeleteFood(foodItem.id)}
                            className='text-muted hover:text-danger p-1'
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
            </div>

            {foodDatabase.filter((foodItem) => !foodItem.is_default).length ===
              0 && (
              <p className='text-sm text-muted text-center py-4'>
                아직 추가한 음식이 없습니다.
              </p>
            )}
          </div>

          {/* 나만의 영양제·건강식품 관리 */}
          <div className='mb-6'>
            <h4 className='font-medium mb-3 text-foreground'>
              나만의 영양제·건강식품
            </h4>

            {/* 새 영양제 추가 */}
            <div className='flex gap-2 mb-3'>
              <input
                type='text'
                placeholder='품목명'
                value={newSupplement.name}
                onChange={(e) =>
                  onNewSupplementChange({
                    ...newSupplement,
                    name: e.target.value,
                  })
                }
                className='flex-1 p-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-accent'
              />
              <input
                type='text'
                placeholder='수량'
                value={newSupplement.quantity}
                onChange={(e) =>
                  onNewSupplementChange({
                    ...newSupplement,
                    quantity: e.target.value,
                  })
                }
                className='w-20 p-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-accent'
              />
              <input
                type='text'
                placeholder='용량'
                value={newSupplement.dosage}
                onChange={(e) =>
                  onNewSupplementChange({
                    ...newSupplement,
                    dosage: e.target.value,
                  })
                }
                className='w-20 p-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-accent'
              />
              <button
                onClick={onAddSupplement}
                disabled={!newSupplement.name}
                className='px-3 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:bg-muted-bg-hover disabled:text-muted disabled:cursor-not-allowed shrink-0'
              >
                <Plus size={16} />
              </button>
            </div>

            {/* 내가 추가한 영양제 목록 */}
            <div className='space-y-2 max-h-40 overflow-y-auto'>
              {supplementDatabase.map((item) => {
                const detail = [item.quantity, item.dosage]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <div
                    key={item.id}
                    className='flex justify-between items-center text-sm bg-muted-bg p-2 rounded-lg'
                  >
                    {editingSupplement === item.id ? (
                      // 편집 모드
                      <div className='flex gap-2 flex-1'>
                        <input
                          type='text'
                          defaultValue={item.name}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const target = e.target as HTMLInputElement;
                              onUpdateSupplement(item.id, {
                                name: target.value,
                              });
                            }
                          }}
                          className='flex-1 p-1 text-xs border border-border rounded focus:ring-1 focus:ring-accent'
                        />
                        <input
                          type='text'
                          placeholder='수량'
                          defaultValue={item.quantity}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const target = e.target as HTMLInputElement;
                              onUpdateSupplement(item.id, {
                                quantity: target.value,
                              });
                            }
                          }}
                          className='w-14 p-1 text-xs border border-border rounded focus:ring-1 focus:ring-accent'
                        />
                        <input
                          type='text'
                          placeholder='용량'
                          defaultValue={item.dosage}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const target = e.target as HTMLInputElement;
                              onUpdateSupplement(item.id, {
                                dosage: target.value,
                              });
                            }
                          }}
                          className='w-14 p-1 text-xs border border-border rounded focus:ring-1 focus:ring-accent'
                        />
                        <button
                          onClick={onStopEditingSupplement}
                          className='text-success hover:opacity-80'
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    ) : (
                      // 보기 모드
                      <>
                        <span className='flex-1 text-foreground'>
                          {item.name}
                          {detail && (
                            <span className='text-muted'> · {detail}</span>
                          )}
                        </span>
                        <div className='flex gap-1'>
                          <button
                            onClick={() => onEditSupplement(item.id)}
                            className='text-muted hover:text-accent p-1'
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            onClick={() => onDeleteSupplement(item.id)}
                            className='text-muted hover:text-danger p-1'
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {supplementDatabase.length === 0 && (
              <p className='text-sm text-muted text-center py-4'>
                아직 추가한 영양제·건강식품이 없습니다.
              </p>
            )}
          </div>
        </div>

        {/* 닫기 버튼 */}
        <div className='flex justify-end px-6 pt-4 pb-6 border-t border-border shrink-0'>
          <button
            onClick={onClose}
            className='px-4 py-2 bg-muted-bg text-foreground rounded-lg hover:bg-muted-bg-hover'
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
