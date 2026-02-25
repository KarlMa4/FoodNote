import { useLanguage } from "@/context/LanguageContext";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import CaloriesCircle from "./CaloriesCircle";
import MacroRow from "./MacroRow";

type ActiveKey = "protein" | "fat" | "carbos" | null;

export default function NutritionDashboardCard({ totals }: any) {
  const { t } = useLanguage();
  const targets = { calories: 2200, protein: 140, carbos: 250, fat: 70 };

  const [active, setActive] = useState<ActiveKey>(null);

  const safeTotals = useMemo(
    () => ({
      calories: Number(totals?.calories ?? 0),
      protein: Number(totals?.protein ?? 0),
      fat: Number(totals?.fat ?? 0),
      carbos: Number(totals?.carbos ?? 0),
    }),
    [totals],
  );

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t("nutrition.dailyProgress")}</Text>

      <View style={styles.row}>
        {/* 🔥 主圓環永遠顯示 calories + 固定綠色 */}
        <CaloriesCircle value={safeTotals.calories} target={targets.calories} />

        <View style={{ flex: 1 }}>
          <MacroRow
            label={t("nutrition.protein")}
            current={safeTotals.protein}
            total={targets.protein}
            color="#3b82f6"
            active={active === "protein"}
            onPress={() => setActive("protein")}
          />
          <MacroRow
            label={t("nutrition.fat")}
            current={safeTotals.fat}
            total={targets.fat}
            color="#eab308"
            active={active === "fat"}
            onPress={() => setActive("fat")}
          />
          <MacroRow
            label={t("nutrition.carbs")}
            current={safeTotals.carbos}
            total={targets.carbos}
            color="#f97316"
            active={active === "carbos"}
            onPress={() => setActive("carbos")}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0f172a",
    borderRadius: 32,
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
});
