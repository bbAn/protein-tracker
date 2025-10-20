import React from "react";
import { DAY_NAMES } from "../../constants";
import { DayRecord } from "../../types";
import { generateCalendar } from "../../utils/dateUtils";

interface CalendarViewProps {
  currentDate: Date;
  selectedDate: string;
  dailyRecords: Record<string, DayRecord>;
  bodyWeight: number;
  getTargetProtein: (hasCardio: boolean, hasStrength: boolean) => number;
  onDateChange: (date: Date) => void;
  onDateSelect: (dateString: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  currentDate,
  selectedDate,
  dailyRecords,
  getTargetProtein,
  onDateChange,
  onDateSelect,
}) => {
  return (
    <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">
          {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() =>
              onDateChange(
                new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
              )
            }
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            이전
          </button>
          <button
            onClick={() =>
              onDateChange(
                new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
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
          const dayRecord = dailyRecords[dateString] || {
            breakfast: [],
            lunch: [],
            dinner: [],
            hasCardio: false,
            hasStrength: false,
          };

          const dayTotal = [
            ...dayRecord.breakfast,
            ...dayRecord.lunch,
            ...dayRecord.dinner,
          ].reduce((sum, food) => sum + food.protein, 0);

          const dayTarget = getTargetProtein(
            dayRecord.hasCardio,
            dayRecord.hasStrength
          );

          const isSelected = dateString === selectedDate;
          const isToday = dateString === new Date().toDateString();

          return (
            <div
              key={dateString}
              onClick={() => onDateSelect(dateString)}
              className={`h-14 border-2 rounded-lg cursor-pointer transition-all ${
                isSelected
                  ? "border-blue-500 bg-blue-50"
                  : isToday
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="p-1 h-full flex flex-col justify-between">
                <div className="text-sm font-medium">{date.getDate()}</div>
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
                    {(dayRecord.hasCardio || dayRecord.hasStrength) && (
                      <div className="flex gap-0.5 justify-center">
                        {dayRecord.hasCardio && (
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        )}
                        {dayRecord.hasStrength && (
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
