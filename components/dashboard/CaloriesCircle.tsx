import { useLanguage } from "@/context/LanguageContext";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
    useAnimatedProps,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function CaloriesCircle({
  value,
  target,
}: {
  value: number;
  target: number;
}) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<"left" | "consumed">("left");
  const goalReached = useRef(false);

  const safeValue = Number(value ?? 0);
  const safeTarget = Number(target ?? 1);

  const percent = Math.min(safeValue / safeTarget, 1);
  const remaining = Math.max(0, safeTarget - safeValue);

  const radius = 45;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(percent, { duration: 900 });
  }, [percent]);

  useEffect(() => {
    if (percent >= 1 && !goalReached.current) {
      goalReached.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (percent < 1) goalReached.current = false;
  }, [percent]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => setMode(mode === "left" ? "consumed" : "left")}
    >
      <View style={styles.container}>
        <Svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          style={{ transform: [{ rotate: "-90deg" }] }}
        >
          <Circle
            cx="60"
            cy="60"
            r={radius}
            stroke="#1e293b"
            strokeWidth={strokeWidth}
            fill="transparent"
          />

          <AnimatedCircle
            cx="60"
            cy="60"
            r={radius}
            stroke="#22c55e"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            animatedProps={animatedProps}
            strokeLinecap="round"
            fill="transparent"
          />
        </Svg>

        <View style={styles.center}>
          <Text style={styles.big}>
            {Math.round(mode === "left" ? remaining : safeValue)}
          </Text>

          <Text style={styles.label}>
            {mode === "left"
              ? t("nutrition.caloriesLeft")
              : t("nutrition.caloriesConsumed")}
          </Text>

          <Text style={styles.unit}>kcal</Text>

          {percent >= 1 && (
            <Text style={styles.hit}>{t("nutrition.goalHit")}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 120,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  center: {
    position: "absolute",
    alignItems: "center",
  },
  big: {
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
  },
  label: {
    fontSize: 11,
    color: "#cbd5e1",
    marginTop: 2,
  },
  unit: {
    fontSize: 9,
    color: "#64748b",
    marginTop: 2,
  },
  hit: {
    marginTop: 4,
    fontSize: 9,
    color: "#4ade80",
    fontWeight: "800",
  },
});
