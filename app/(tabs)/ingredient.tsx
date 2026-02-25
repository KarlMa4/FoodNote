import RecentFoodList, {
    RecentFoodItem,
} from "@/components/log/RecentFoodList";
import { useLanguage } from "@/context/LanguageContext";
import { useNutrition } from "@/context/NutritionContext";
import { deleteIngredient, getAllIngredients, Ingredient } from "@/db/db";
import { useFocusEffect, useRouter } from "expo-router";
import { ArrowLeft, Plus } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function IngredientScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { addFood, reload } = useNutrition();

  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [recentFoods, setRecentFoods] = useState<
    (RecentFoodItem & Ingredient)[]
  >([]);
  const [selectedFood, setSelectedFood] = useState<
    (RecentFoodItem & Ingredient) | null
  >(null);

  const [formData, setFormData] = useState({
    title: "",
    calories: "",
    protein: "",
    fat: "",
    carbs: "",
  });

  // 動態讀取最近新增的 ingredients
  const loadRecentFoods = useCallback(() => {
    const allIngredients = getAllIngredients();
    const foods = allIngredients.slice(0, 10); // 取最近 10 個
    setRecentFoods(foods as (RecentFoodItem & Ingredient)[]);
  }, []);

  useFocusEffect(loadRecentFoods);

  const handleIngredientDetail = (food: RecentFoodItem & Ingredient) => {
    setSelectedFood(food);
    setView("detail");
  };

  const handleDeleteIngredient = (
    index: number,
    food: RecentFoodItem & Ingredient,
  ) => {
    if (food.id) {
      deleteIngredient(food.id);
      loadRecentFoods();
    }
  };

  const handleSave = () => {
    if (!formData.title || !formData.calories) return;

    addFood({
      name: formData.title,
      calories: parseInt(formData.calories),
      protein: parseInt(formData.protein) || 0,
      fat: parseInt(formData.fat) || 0,
      carbos: parseInt(formData.carbs) || 0,
    });

    setFormData({
      title: "",
      calories: "",
      protein: "",
      fat: "",
      carbs: "",
    });

    reload();
    loadRecentFoods(); // 更新最近食物列表
    setView("list"); // 回到 ingredient 列表視圖
  };

  // ===============================
  // DETAIL VIEW
  // ===============================
  if (view === "detail" && selectedFood) {
    const proteinTotal = selectedFood.protein_100g || 0;
    const fatTotal = selectedFood.fat_100g || 0;
    const carbsTotal = selectedFood.carbs_100g || 0;
    const caloriesTotal = selectedFood.calories_100g || 0;

    const proteinCals = proteinTotal * 4;
    const fatCals = fatTotal * 9;
    const carbsCals = carbsTotal * 4;
    const totalCals = proteinCals + fatCals + carbsCals;

    const proteinPercent = totalCals > 0 ? (proteinCals / totalCals) * 100 : 0;
    const fatPercent = totalCals > 0 ? (fatCals / totalCals) * 100 : 0;
    const carbsPercent = totalCals > 0 ? (carbsCals / totalCals) * 100 : 0;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => setView("list")}>
            <ArrowLeft size={24} color="#334155" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t("ingredient.details") || "詳情"}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.detailContainer}>
          {/* Header Card */}
          <View style={styles.headerCard}>
            <Text style={styles.detailName}>{selectedFood.name}</Text>
            {selectedFood.barcode && (
              <Text style={styles.detailBarcode}>{selectedFood.barcode}</Text>
            )}
            {selectedFood.serving_size_g && (
              <Text style={styles.detailServing}>
                份量: {selectedFood.serving_size_g}g
              </Text>
            )}
          </View>

          {/* Calories Card */}
          <View style={styles.caloriesCard}>
            <Text style={styles.caloriesLabel}>
              {t("nutrition.energy") || "能量"}
            </Text>
            <Text style={styles.caloriesValue}>
              {Math.round(caloriesTotal)}{" "}
              <Text style={styles.caloriesUnit}>kcal</Text>
            </Text>
          </View>

          {/* Macronutrients */}
          <Text style={styles.sectionTitle}>
            {t("nutrition.macronutrients") || "宏營養素"}
          </Text>

          {/* Protein */}
          <View style={styles.macroCard}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroName}>
                {t("nutrition.protein") || "蛋白質"}
              </Text>
              <Text style={styles.macroValue}>{Math.round(proteinTotal)}g</Text>
            </View>
            <Text style={styles.macroCals}>{Math.round(proteinCals)} kcal</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(proteinPercent, 100)}%`,
                    backgroundColor: "#3b82f6",
                  },
                ]}
              />
            </View>
          </View>

          {/* Fat */}
          <View style={styles.macroCard}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroName}>
                {t("nutrition.fat") || "脂肪"}
              </Text>
              <Text style={styles.macroValue}>{Math.round(fatTotal)}g</Text>
            </View>
            <Text style={styles.macroCals}>{Math.round(fatCals)} kcal</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(fatPercent, 100)}%`,
                    backgroundColor: "#eab308",
                  },
                ]}
              />
            </View>
          </View>

          {/* Carbs */}
          <View style={styles.macroCard}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroName}>
                {t("nutrition.carbs") || "碳水"}
              </Text>
              <Text style={styles.macroValue}>{Math.round(carbsTotal)}g</Text>
            </View>
            <Text style={styles.macroCals}>{Math.round(carbsCals)} kcal</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(carbsPercent, 100)}%`,
                    backgroundColor: "#f97316",
                  },
                ]}
              />
            </View>
          </View>

          {/* Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>
              {t("nutrition.summary") || "營養摘要"}
            </Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryPercent}>
                  {Math.round(proteinPercent)}%
                </Text>
                <Text style={styles.summaryLabel}>
                  {t("nutrition.protein") || "蛋白質"}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryPercent}>
                  {Math.round(fatPercent)}%
                </Text>
                <Text style={styles.summaryLabel}>
                  {t("nutrition.fat") || "脂肪"}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryPercent}>
                  {Math.round(carbsPercent)}%
                </Text>
                <Text style={styles.summaryLabel}>
                  {t("nutrition.carbs") || "碳水"}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ===============================
  // CREATE VIEW
  // ===============================
  if (view === "create") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => setView("list")}>
            <ArrowLeft size={24} color="#334155" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("ingredient.addTitle")}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.formContainer}>
          <Text style={styles.label}>{t("ingredient.name")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("ingredient.nameExample")}
            value={formData.title}
            onChangeText={(t) => setFormData({ ...formData, title: t })}
          />

          <Text style={styles.label}>{t("ingredient.calories")}</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="0"
            value={formData.calories}
            onChangeText={(t) => setFormData({ ...formData, calories: t })}
          />

          <View style={styles.macroRow}>
            <View style={styles.macroInput}>
              <Text style={styles.macroLabel}>{t("nutrition.protein")}</Text>
              <TextInput
                style={styles.smallInput}
                keyboardType="numeric"
                value={formData.protein}
                onChangeText={(t) => setFormData({ ...formData, protein: t })}
              />
            </View>

            <View style={styles.macroInput}>
              <Text style={styles.macroLabel}>{t("nutrition.fat")}</Text>
              <TextInput
                style={styles.smallInput}
                keyboardType="numeric"
                value={formData.fat}
                onChangeText={(t) => setFormData({ ...formData, fat: t })}
              />
            </View>

            <View style={styles.macroInput}>
              <Text style={styles.macroLabel}>{t("nutrition.carbs")}</Text>
              <TextInput
                style={styles.smallInput}
                keyboardType="numeric"
                value={formData.carbs}
                onChangeText={(t) => setFormData({ ...formData, carbs: t })}
              />
            </View>
          </View>
        </ScrollView>

        <TouchableOpacity
          style={[
            styles.saveBtn,
            (!formData.title || !formData.calories) && { opacity: 0.5 },
          ]}
          disabled={!formData.title || !formData.calories}
          onPress={handleSave}
        >
          <Text style={styles.saveText}>{t("ingredient.save")}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ===============================
  // LIST VIEW
  // ===============================
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.pageTitle}>{t("ingredient.library")}</Text>

        <TouchableOpacity
          style={styles.createCard}
          onPress={() => setView("create")}
        >
          <View style={styles.createIcon}>
            <Plus size={20} color="#FFF" />
          </View>
          <View>
            <Text style={styles.createTitle}>{t("ingredient.addTitle")}</Text>
            <Text style={styles.createSubtitle}>
              {t("ingredient.addSubtitle")}
            </Text>
          </View>
        </TouchableOpacity>

        <RecentFoodList
          foods={recentFoods}
          onDetail={handleIngredientDetail}
          onDelete={handleDeleteIngredient}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAF9",
  },

  pageTitle: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#0f172a",
  },

  createCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#ecfdf5",
    borderRadius: 20,
    marginBottom: 30,
  },

  createIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#22c55e",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  createTitle: {
    fontWeight: "bold",
    fontSize: 16,
  },

  createSubtitle: {
    fontSize: 12,
    color: "#64748b",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },

  formContainer: {
    padding: 20,
    gap: 16,
  },

  label: {
    fontWeight: "bold",
    marginBottom: 6,
  },

  input: {
    backgroundColor: "#FFF",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  macroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },

  macroInput: {
    width: "30%",
  },

  macroLabel: {
    fontSize: 12,
    marginBottom: 4,
    color: "#64748b",
  },

  smallInput: {
    backgroundColor: "#FFF",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    textAlign: "center",
  },

  saveBtn: {
    backgroundColor: "#22c55e",
    padding: 18,
    margin: 20,
    borderRadius: 20,
    alignItems: "center",
  },

  saveText: {
    color: "#FFF",
    fontWeight: "bold",
  },

  // Detail View Styles
  detailContainer: {
    padding: 20,
    paddingBottom: 40,
  },

  headerCard: {
    backgroundColor: "#22c55e",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },

  detailName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 8,
  },

  detailBarcode: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 4,
  },

  detailServing: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },

  caloriesCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  caloriesLabel: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 8,
    fontWeight: "600",
  },

  caloriesValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#0f172a",
  },

  caloriesUnit: {
    fontSize: 14,
    fontWeight: "normal",
    color: "#64748b",
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#94a3b8",
    marginBottom: 12,
    marginTop: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  macroCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  macroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  macroName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },

  macroValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
  },

  macroCals: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 12,
  },

  progressBar: {
    height: 8,
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 4,
  },

  summaryCard: {
    backgroundColor: "#f1f5f9",
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  summaryTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 12,
  },

  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },

  summaryItem: {
    alignItems: "center",
  },

  summaryPercent: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 4,
  },

  summaryLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
});
