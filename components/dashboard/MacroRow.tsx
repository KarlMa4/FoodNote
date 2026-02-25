import React, { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

export default function MacroRow({
  label,
  current,
  total,
  color,
  onPress,
  active,
}: {
  label: string;
  current: number;
  total: number;
  color: string;
  onPress?: () => void;
  active?: boolean;
}) {
  const safeCurrent = Number.isFinite(current) ? current : 0;
  const safeTotal = Number.isFinite(total) && total > 0 ? total : 1;
  const percent = Math.min(safeCurrent / safeTotal, 1);

  const scale = useSharedValue(1);
  const glow = useSharedValue(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    scale.value = withTiming(active ? 1.04 : 1, { duration: 200 });
    glow.value = withTiming(active ? 1 : 0, { duration: 250 });
  }, [active]);

  useEffect(() => {
    progress.value = withTiming(percent, { duration: 800 });
  }, [percent]);

  const animatedContainer = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: glow.value * 0.4,
    shadowRadius: interpolate(glow.value, [0, 1], [0, 10]),
  }));

  const animatedFill = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Animated.View style={[styles.container, animatedContainer]}>
        <View style={styles.topRow}>
          <Text style={[styles.label, active && styles.labelActive]}>
            {label}
          </Text>

          <Text style={styles.value}>
            <Text style={styles.valueStrong}>{Math.round(safeCurrent)}</Text>
            <Text style={styles.valueDim}>/{safeTotal}g</Text>
          </Text>
        </View>

        <View style={styles.track}>
          <Animated.View
            style={[styles.fill, { backgroundColor: color }, animatedFill]}
          />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },

  label: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "600",
  },

  labelActive: {
    color: "#fff",
  },

  value: {
    fontSize: 12,
  },

  valueStrong: {
    color: "#fff",
    fontWeight: "800",
  },

  valueDim: {
    color: "#64748b",
    fontSize: 10,
  },

  track: {
    height: 6,
    backgroundColor: "#1e293b",
    borderRadius: 3,
    overflow: "hidden",
  },

  fill: {
    height: "100%",
    borderRadius: 3,
  },
});
