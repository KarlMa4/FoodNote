import { parseYMDToLocalDate } from "@/components/dashboard/date_control";
import { useLanguage } from "@/context/LanguageContext";
import { useNutrition } from "@/context/NutritionContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface CalendarDay {
  ymd: string;
  date: number;
  isCurrentMonth: boolean;
}

export default function CalendarScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { setSelectedDate } = useNutrition();
  const params = useLocalSearchParams();
  const currentYMD = params.current as string;

  const [viewDate, setViewDate] = useState<Date>(
    parseYMDToLocalDate(currentYMD),
  );

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getCalendarDays = (date: Date): CalendarDay[] => {
    const days: CalendarDay[] = [];
    const firstDay = getFirstDayOfMonth(date);
    const daysInMonth = getDaysInMonth(date);
    const prevMonthDays = getDaysInMonth(
      new Date(date.getFullYear(), date.getMonth() - 1),
    );

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const prevDate = new Date(date.getFullYear(), date.getMonth() - 1, day);
      const year = prevDate.getFullYear();
      const month = String(prevDate.getMonth() + 1).padStart(2, "0");
      const dateStr = String(day).padStart(2, "0");
      days.push({
        ymd: `${year}-${month}-${dateStr}`,
        date: day,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const currDate = new Date(date.getFullYear(), date.getMonth(), day);
      const year = currDate.getFullYear();
      const month = String(currDate.getMonth() + 1).padStart(2, "0");
      const dateStr = String(day).padStart(2, "0");
      days.push({
        ymd: `${year}-${month}-${dateStr}`,
        date: day,
        isCurrentMonth: true,
      });
    }

    // Next month days
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const nextDate = new Date(date.getFullYear(), date.getMonth() + 1, day);
      const year = nextDate.getFullYear();
      const month = String(nextDate.getMonth() + 1).padStart(2, "0");
      const dateStr = String(day).padStart(2, "0");
      days.push({
        ymd: `${year}-${month}-${dateStr}`,
        date: day,
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const isToday = (ymd: string) => {
    const today = new Date();
    const todayYMD = `${today.getFullYear()}-${String(
      today.getMonth() + 1,
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    return ymd === todayYMD;
  };

  const isSelected = (ymd: string) => {
    return ymd === currentYMD;
  };

  const handleDateSelect = (ymd: string) => {
    setSelectedDate(ymd);
    router.back();
  };

  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const days = getCalendarDays(viewDate);
  const monthName = viewDate.toLocaleDateString(
    language === "zh-TW" ? "zh-TW" : "en-US",
    {
      year: "numeric",
      month: "long",
    },
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={prevMonth} style={styles.arrowButton}>
          <Text style={styles.arrowText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthText}>{monthName}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.arrowButton}>
          <Text style={styles.arrowText}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekDaysRow}>
        {[
          t("date.sun"),
          t("date.mon"),
          t("date.tue"),
          t("date.wed"),
          t("date.thu"),
          t("date.fri"),
          t("date.sat"),
        ].map((day) => (
          <View key={day} style={styles.weekDayCell}>
            <Text style={styles.weekDayText}>{day}</Text>
          </View>
        ))}
      </View>

      <ScrollView style={styles.calendar}>
        <View style={styles.daysGrid}>
          {days.map((day, index) => (
            <TouchableOpacity
              key={`${day.ymd}-${index}`}
              style={[
                styles.dayCell,
                !day.isCurrentMonth && styles.otherMonthDay,
                isSelected(day.ymd) && styles.selectedDay,
                isToday(day.ymd) && styles.todayDay,
              ]}
              onPress={() => handleDateSelect(day.ymd)}
              activeOpacity={0.6}
            >
              <Text
                style={[
                  styles.dayText,
                  !day.isCurrentMonth && styles.otherMonthText,
                  isSelected(day.ymd) && styles.selectedDayText,
                  isToday(day.ymd) && !isSelected(day.ymd) && styles.todayText,
                ]}
              >
                {day.date}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  monthText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  arrowButton: {
    padding: 8,
  },
  arrowText: {
    fontSize: 28,
    color: "#6b7280",
  },
  weekDaysRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f9fafb",
  },
  weekDayCell: {
    flex: 1,
    alignItems: "center",
  },
  weekDayText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  calendar: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  dayCell: {
    width: "14.28%", // 100 / 7
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 4,
  },
  dayText: {
    fontSize: 16,
    color: "#1f2937",
    fontWeight: "500",
  },
  otherMonthDay: {
    opacity: 0.3,
  },
  otherMonthText: {
    color: "#d1d5db",
  },
  todayDay: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#3b82f6",
  },
  todayText: {
    color: "#3b82f6",
    fontWeight: "700",
  },
  selectedDay: {
    borderRadius: 8,
    backgroundColor: "#3b82f6",
  },
  selectedDayText: {
    color: "#fff",
    fontWeight: "700",
  },
});
