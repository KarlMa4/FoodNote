import { useLanguage } from "@/context/LanguageContext";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Camera, Minus, Plus, Search, X } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    calcTemplateNutrition,
    createMealTemplate,
    getAllIngredients,
    getAllMealTemplates,
    updateMealTemplate,
} from "../db/db";

export default function MealBuilderPage() {
  const PORTION_STEP = 0.25;
  const MIN_PORTION = 0.25;
  const roundTo2 = (value: number) => Math.round(value * 100) / 100;
  const roundToQuarter = (value: number) => Math.round(value * 4) / 4;
  const getServingSize = (item: any) => Number(item.serving_size_g) || 100;
  const formatPortion = (value: number) => {
    const rounded = roundToQuarter(value);
    const whole = Math.floor(rounded);
    const remainder = roundToQuarter(rounded - whole);

    const remainderText =
      remainder === 0
        ? ""
        : remainder === 0.25
          ? "1/4"
          : remainder === 0.5
            ? "1/2"
            : remainder === 0.75
              ? "3/4"
              : remainder.toFixed(2);

    if (whole === 0) return remainderText || "0";
    if (!remainderText) return String(whole);
    return `${whole} ${remainderText}`;
  };

  const { id } = useLocalSearchParams();
  const { t } = useLanguage();
  const [allIngredients, setAllIngredients] = useState(getAllIngredients());

  // 每次頁面重新聚焦時，重新讀取 ingredients
  useFocusEffect(
    useCallback(() => {
      setAllIngredients(getAllIngredients());
    }, []),
  );

  const editingTemplate = id
    ? getAllMealTemplates().find((t: any) => t.id === Number(id))
    : null;

  const [mealName, setMealName] = useState(editingTemplate?.name ?? "");
  const [selected, setSelected] = useState<any[]>(() =>
    (editingTemplate?.items ?? []).map((item: any) => {
      const servingSize = getServingSize(item);
      const grams = Number(item.grams) || servingSize;
      const portion = Math.max(
        MIN_PORTION,
        roundToQuarter(grams / servingSize),
      );
      return {
        ...item,
        grams: roundTo2(portion * servingSize),
        portion,
      };
    }),
  );
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const nutrition = useMemo(() => calcTemplateNutrition(selected), [selected]);

  const filteredIngredients = allIngredients.filter((ing) =>
    ing.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const addIngredient = (ing: any) => {
    const existing = selected.find((s) => s.ingredient_id === ing.id);
    if (existing) {
      updatePortion(ing.id, PORTION_STEP);
    } else {
      const servingSize = getServingSize(ing);
      setSelected((prev) => [
        ...prev,
        {
          ...ing,
          ingredient_id: ing.id,
          portion: 1,
          grams: roundTo2(servingSize),
        },
      ]);
    }
    setShowPicker(false);
    setSearchQuery("");
  };

  const updatePortion = (id: number, delta: number) => {
    setSelected((prev) =>
      prev.map((item) =>
        item.ingredient_id === id
          ? (() => {
              const servingSize = getServingSize(item);
              const currentPortion = Number(item.portion) || 1;
              const nextPortion = Math.max(
                MIN_PORTION,
                roundToQuarter(currentPortion + delta),
              );
              return {
                ...item,
                portion: nextPortion,
                grams: roundTo2(nextPortion * servingSize),
              };
            })()
          : item,
      ),
    );
  };

  const removeIngredient = (id: number) => {
    setSelected((prev) => prev.filter((item) => item.ingredient_id !== id));
  };

  const handleSave = () => {
    const items = selected.map((s) => ({
      ingredient_id: s.ingredient_id,
      grams: s.grams,
    }));
    if (editingTemplate) {
      updateMealTemplate(editingTemplate.id, mealName, items);
    } else {
      createMealTemplate(mealName, items);
    }
    router.back();
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
            <ArrowLeft size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={s.title}>
            {editingTemplate
              ? t("mealBuilder.editMeal")
              : t("mealBuilder.createMeal")}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={s.content}>
          {/* Photo Placeholder */}
          <View style={s.photoBox}>
            <Camera size={32} color="#94a3b8" />
            <Text style={s.photoText}>{t("mealBuilder.addPhoto")}</Text>
          </View>

          {/* Meal Name Input */}
          <View style={s.inputGroup}>
            <Text style={s.label}>{t("mealBuilder.mealName")}</Text>
            <TextInput
              style={s.input}
              placeholder={t("mealBuilder.mealNamePlaceholder")}
              value={mealName}
              onChangeText={setMealName}
            />
          </View>

          {/* Ingredients Section */}
          <View style={s.sectionHeader}>
            <Text style={s.label}>{t("mealBuilder.ingredients")}</Text>
            <TouchableOpacity
              style={s.addBtn}
              onPress={() => setShowPicker(true)}
            >
              <Text style={s.addBtnText}>{t("mealBuilder.add")}</Text>
            </TouchableOpacity>
          </View>

          {selected.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyText}>{t("mealBuilder.noIngredients")}</Text>
            </View>
          ) : (
            selected.map((item) => (
              <View key={item.ingredient_id} style={s.ingCard}>
                <View style={s.ingCardTop}>
                  <Text style={s.ingName}>{item.name}</Text>
                  <TouchableOpacity
                    onPress={() => removeIngredient(item.ingredient_id)}
                  >
                    <Text style={s.removeText}>{t("mealBuilder.remove")}</Text>
                  </TouchableOpacity>
                </View>

                <View style={s.ingCardBottom}>
                  <View style={s.counter}>
                    <TouchableOpacity
                      onPress={() =>
                        updatePortion(item.ingredient_id, -PORTION_STEP)
                      }
                      style={s.countBtn}
                    >
                      <Minus size={16} color="#64748b" />
                    </TouchableOpacity>
                    <Text style={s.countText}>
                      {formatPortion(item.portion)} 份
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        updatePortion(item.ingredient_id, PORTION_STEP)
                      }
                      style={[s.countBtn, { backgroundColor: "#dcfce7" }]}
                    >
                      <Plus size={16} color="#16a34a" />
                    </TouchableOpacity>
                  </View>
                  <Text style={s.ingKcal}>
                    {(
                      (Number(item.calories_100g) || 0) *
                      ((Number(item.grams) || 0) / getServingSize(item))
                    ).toFixed(0)}{" "}
                    kcal
                  </Text>
                </View>
              </View>
            ))
          )}

          {/* Nutrition Summary (Gradient Effect replacement) */}
          {selected.length > 0 && (
            <View style={s.summaryCard}>
              <Text style={s.summaryLabel}>
                {t("mealBuilder.totalNutrition")}
              </Text>
              <View style={s.summaryRow}>
                <View>
                  <Text style={s.summaryKcal}>
                    {nutrition.calories.toFixed(0)}{" "}
                    <Text style={{ fontSize: 14 }}>kcal</Text>
                  </Text>
                </View>
                <View style={s.summaryMacros}>
                  <View style={s.macroItem}>
                    <Text style={s.macroVal}>
                      {nutrition.protein.toFixed(1)}g
                    </Text>
                    <Text style={s.macroLab}>P</Text>
                  </View>
                  <View style={s.macroItem}>
                    <Text style={s.macroVal}>{nutrition.fat.toFixed(1)}g</Text>
                    <Text style={s.macroLab}>F</Text>
                  </View>
                  <View style={s.macroItem}>
                    <Text style={s.macroVal}>
                      {nutrition.carbs.toFixed(1)}g
                    </Text>
                    <Text style={s.macroLab}>C</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer Save Button */}
        <View style={s.footer}>
          <TouchableOpacity
            style={[
              s.saveBtn,
              (!mealName || selected.length === 0) && s.disabledBtn,
            ]}
            onPress={handleSave}
            disabled={!mealName || selected.length === 0}
          >
            <Text style={s.saveBtnText}>{t("mealBuilder.save")}</Text>
          </TouchableOpacity>
        </View>

        {/* Ingredient Picker Modal */}
        <Modal visible={showPicker} animationType="slide" transparent={true}>
          <View style={s.modalOverlay}>
            <View style={s.modalContent}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{t("ingredient.addTitle")}</Text>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={s.modalSearch}>
                <Search size={20} color="#94a3b8" />
                <TextInput
                  style={s.modalInput}
                  placeholder={t("mealBuilder.search")}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <ScrollView style={{ padding: 20 }}>
                {filteredIngredients.map((ing) => (
                  <TouchableOpacity
                    key={ing.id}
                    style={s.pickerItem}
                    onPress={() => addIngredient(ing)}
                  >
                    <View>
                      <Text style={s.pickerName}>{ing.name}</Text>
                      <Text style={s.pickerSub}>
                        {(Number(ing.calories_100g) || 0).toFixed(0)} kcal / 份
                      </Text>
                    </View>
                    <Plus size={20} color="#22c55e" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fafaf9" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "white",
  },
  title: { fontSize: 20, fontWeight: "800", color: "#0f172a" },
  iconBtn: { padding: 8 },
  content: { padding: 20 },
  photoBox: {
    width: "100%",
    height: 140,
    backgroundColor: "#f1f5f9",
    borderRadius: 20,
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: "#cbd5e1",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  photoText: {
    marginTop: 8,
    fontSize: 14,
    color: "#94a3b8",
    fontWeight: "600",
  },
  label: { fontSize: 14, fontWeight: "800", color: "#475569", marginBottom: 8 },
  input: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    fontSize: 16,
  },
  inputGroup: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  addBtn: {
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addBtnText: { color: "#16a34a", fontWeight: "700", fontSize: 14 },
  emptyBox: {
    padding: 40,
    alignItems: "center",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#f1f5f9",
    borderRadius: 20,
  },
  emptyText: { color: "#cbd5e1" },
  ingCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  ingCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  ingName: { fontWeight: "700", color: "#1e293b", fontSize: 16 },
  removeText: { color: "#ef4444", fontSize: 12, fontWeight: "600" },
  ingCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  counter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 30,
    padding: 4,
  },
  countBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e2e8f0",
  },
  countText: {
    width: 60,
    textAlign: "center",
    fontWeight: "700",
    color: "#1e293b",
  },
  ingKcal: { fontWeight: "700", color: "#475569" },
  summaryCard: {
    backgroundColor: "#10b981",
    padding: 20,
    borderRadius: 24,
    marginTop: 20,
  },
  summaryLabel: {
    color: "white",
    opacity: 0.8,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  summaryKcal: { color: "white", fontSize: 32, fontWeight: "800" },
  summaryMacros: { flexDirection: "row", gap: 12 },
  macroItem: { alignItems: "center" },
  macroVal: { color: "white", fontWeight: "700", fontSize: 14 },
  macroLab: { color: "white", opacity: 0.7, fontSize: 10 },
  footer: {
    padding: 20,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  saveBtn: {
    backgroundColor: "#22c55e",
    padding: 18,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  saveBtnText: { color: "white", fontWeight: "800", fontSize: 16 },
  disabledBtn: { backgroundColor: "#cbd5e1", shadowOpacity: 0 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  modalSearch: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    margin: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    height: 50,
  },
  modalInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  pickerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "white",
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  pickerName: { fontWeight: "700", fontSize: 16 },
  pickerSub: { fontSize: 12, color: "#94a3b8" },
});
