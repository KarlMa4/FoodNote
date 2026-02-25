import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  LayoutAnimation,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";

// 導航與生命週期
import { useFocusEffect } from "@react-navigation/native";

// Context 與 全域狀態
import { useLanguage } from "../../context/LanguageContext";
import { useNutrition } from "../../context/NutritionContext";

// 組件與圖標
import {
  Plus,
  Search,
  Settings,
  Trash2,
  Utensils,
  X,
} from "lucide-react-native";
import NutritionDashboardCard from "../../components/dashboard/NutritionDashboardCard";

// 資料庫操作
import {
  addMealFromTemplate,
  calcTemplateNutrition,
  deleteMeal,
  getAllMealTemplates,
} from "../../db/db";

// 日期控制工具
import {
  getFiveDates,
  parseYMDToLocalDate,
} from "../../components/dashboard/date_control";

export default function IndexDashboard() {
  const { language, setLanguage, t } = useLanguage();
  const { totals, logs, selectedDate, setSelectedDate, reload } =
    useNutrition();
  const activeScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    activeScale.setValue(0.92);
    Animated.spring(activeScale, {
      toValue: 1,
      friction: 5,
      tension: 140,
      useNativeDriver: true,
    }).start();
  }, [activeScale, selectedDate]);

  // 狀態管理
  const [modalVisible, setModalVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    null,
  );
  const [selectedPortion, setSelectedPortion] = useState("1.0");

  /**
   * 頁面聚焦時自動重新獲取資料庫中的餐點模板
   * 同時重置日期為今天，確保每次打開 index 都顯示今天的資料（使用本地時間）
   */
  useFocusEffect(
    useCallback(() => {
      const today = new Date();
      const todayYMD = `${today.getFullYear()}-${String(
        today.getMonth() + 1,
      ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      setSelectedDate(todayYMD);
      const latestTemplates = getAllMealTemplates();
      setTemplates(latestTemplates);
    }, []),
  );

  // 搜尋過濾邏輯
  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // 處理刪除紀錄
  const handleDelete = (id: number, title: string) => {
    Alert.alert(t("app.deleteRecord"), t("app.deleteConfirm", { title }), [
      { text: t("app.cancel"), style: "cancel" },
      {
        text: t("app.delete"),
        style: "destructive",
        onPress: () => {
          deleteMeal(id);
          reload();
        },
      },
    ]);
  };

  // LogItem 組件
  const LogItem = ({ log, onDelete, t }: any) => {
    const isIngredient = log.type === "ingredient";
    const typeColor = isIngredient ? "#3b82f6" : "#16a34a";
    const typeLabel = isIngredient ? t("app.ingredient") : t("app.meal");

    return (
      <View style={[styles.logCard, { borderLeftColor: typeColor }]}>
        <View style={{ flex: 1 }}>
          {/* 標題 + 類型標籤 */}
          <View style={styles.logHeader}>
            <Text style={styles.logName}>{log.title}</Text>
            <View
              style={[styles.typeTag, { backgroundColor: typeColor + "20" }]}
            >
              <Text style={[styles.typeTagText, { color: typeColor }]}>
                {typeLabel}
              </Text>
            </View>
          </View>

          {/* 份量/克數 */}
          <Text style={styles.logSubtitle}>
            {isIngredient
              ? `${Math.round(log.grams || 0)} g`
              : `${t("app.servings")}: ${log.portion}`}
          </Text>

          {/* 營養標籤 */}
          <View style={styles.macroTags}>
            <View style={styles.macroTag}>
              <Text style={styles.macroValue}>
                {Math.round(log.protein || 0)}
              </Text>
              <Text style={styles.macroLabel}>P</Text>
            </View>
            <View style={styles.macroTag}>
              <Text style={styles.macroValue}>{Math.round(log.fat || 0)}</Text>
              <Text style={styles.macroLabel}>F</Text>
            </View>
            <View style={styles.macroTag}>
              <Text style={styles.macroValue}>
                {Math.round(log.carbs || 0)}
              </Text>
              <Text style={styles.macroLabel}>C</Text>
            </View>
          </View>
        </View>

        {/* 右側 - 卡路里 + 刪除按鈕 */}
        <View style={styles.logRightSection}>
          <View style={styles.logRight}>
            <Text style={styles.logCal}>{Math.round(log.calories)}</Text>
            <Text style={styles.logCalUnit}>{t("app.kcal")}</Text>
          </View>

          <TouchableOpacity
            style={styles.logDeleteBtnInCard}
            onPress={onDelete}
            activeOpacity={0.7}
          >
            <Trash2 size={14} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // 處理選擇餐點模板
  const handleSelectTemplate = (id: number) => {
    setSelectedTemplateId(id);
    setSelectedPortion("1.0");
  };

  // 確認新增餐點
  const handleConfirmAddMeal = () => {
    if (!selectedTemplateId) return;
    const portion = parseFloat(selectedPortion) || 1.0;
    addMealFromTemplate({
      date: selectedDate,
      templateId: selectedTemplateId,
      portion,
    });
    setModalVisible(false);
    setSearchQuery("");
    setSelectedTemplateId(null);
    reload();
  };

  const today = new Date();
  const todayYMD = `${today.getFullYear()}-${String(
    today.getMonth() + 1,
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Header */}
        <View style={styles.topHeader}>
          <View style={styles.topHeaderText}>
            <Text style={styles.welcomeLabel}>{t("app.welcomeBack")}</Text>
            <Text style={styles.welcomeName}>Karl</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setSettingsVisible(true)}
          >
            <Settings size={20} color="#64748b" />
            <View style={styles.settingsDot} />
          </TouchableOpacity>
        </View>

        {/* 日期選擇區域 - 5日顯示，居中 */}
        <View style={styles.dateScrollContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateScrollContent}
            scrollEnabled={false}
          >
            {getFiveDates(selectedDate).map((date) => {
              const isActive = date === selectedDate;
              const isToday = date === todayYMD;
              const d = parseYMDToLocalDate(date);
              const weekdayLabel = [
                t("date.sun"),
                t("date.mon"),
                t("date.tue"),
                t("date.wed"),
                t("date.thu"),
                t("date.fri"),
                t("date.sat"),
              ][d.getDay()];
              const displayLabel = isToday ? t("app.today") : weekdayLabel;
              const animatedStyle = isActive
                ? { transform: [{ scale: activeScale }] }
                : undefined;

              return (
                <Animated.View
                  key={date}
                  style={[
                    styles.dateItem,
                    isToday && styles.todayDateItem,
                    isActive && styles.activeDateItem,
                    animatedStyle,
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => {
                      LayoutAnimation.configureNext(
                        LayoutAnimation.Presets.easeInEaseOut,
                      );
                      setSelectedDate(date);
                    }}
                    style={styles.datePressTarget}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.dateWeekday,
                        isActive && styles.activeDateText,
                      ]}
                    >
                      {displayLabel}
                    </Text>
                    <Text
                      style={[
                        styles.dateDay,
                        isActive && styles.activeDateText,
                      ]}
                    >
                      {d.getDate()}
                    </Text>
                    {isActive && <View style={styles.dateDot} />}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </ScrollView>
        </View>

        <Text style={styles.greeting}>{t("app.greeting")}</Text>

        {/* 核心數據卡片 */}
        <NutritionDashboardCard totals={totals} />

        {/* 最近紀錄 Section */}
        <View style={styles.historySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("app.recentLogs")}</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setModalVisible(true)}
            >
              <Plus size={16} color="white" strokeWidth={3} />
              <Text style={styles.addBtnText}>{t("app.addMeal")}</Text>
            </TouchableOpacity>
          </View>

          {logs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Utensils
                size={40}
                color="#cbd5e1"
                style={{ marginBottom: 10 }}
              />
              <Text style={styles.emptyText}>{t("app.emptyLogs")}</Text>
            </View>
          ) : (
            logs.map((log) => (
              <LogItem
                key={log.id}
                log={log}
                onDelete={() =>
                  handleDelete(log.id, log.title || t("app.record"))
                }
                t={t}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* 📋 選擇餐點模板彈窗 (Modal) */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t("app.selectMealTemplate")}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#0f172a" />
              </TouchableOpacity>
            </View>

            {/* 搜尋欄位 */}
            <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
              <View style={styles.searchBar}>
                <Search size={20} color="#94a3b8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t("app.searchMeals")}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            {/* 模板列表 */}
            {selectedTemplateId === null ? (
              <FlatList
                data={filteredTemplates}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{
                  paddingHorizontal: 20,
                  paddingBottom: 30,
                }}
                ListEmptyComponent={
                  <Text
                    style={{
                      textAlign: "center",
                      marginTop: 20,
                      color: "#94a3b8",
                    }}
                  >
                    {t("app.noTemplates")}
                  </Text>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.templateCard}
                    onPress={() => handleSelectTemplate(item.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.templateName}>{item.name}</Text>
                      <Text style={styles.templateInfo}>
                        {Math.round(calcTemplateNutrition(item.items).calories)}{" "}
                        kcal
                      </Text>
                    </View>
                    <View style={styles.templateAddCircle}>
                      <Plus size={18} color="#16a34a" />
                    </View>
                  </TouchableOpacity>
                )}
              />
            ) : (
              <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
                <Text style={styles.selectedTemplateName}>
                  {templates.find((t) => t.id === selectedTemplateId)?.name}
                </Text>
                <View style={styles.portionContainer}>
                  <Text style={styles.portionLabel}>{t("app.servings")}</Text>
                  <TextInput
                    style={styles.portionInput}
                    keyboardType="decimal-pad"
                    placeholderTextColor="#94a3b8"
                    placeholder="1.0"
                    value={selectedPortion}
                    onChangeText={setSelectedPortion}
                  />
                </View>
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={handleConfirmAddMeal}
                >
                  <Text style={styles.confirmBtnText}>
                    {t("app.confirmAdd")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setSelectedTemplateId(null)}
                >
                  <Text style={styles.cancelBtnText}>{t("app.back")}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={settingsVisible} animationType="fade" transparent={true}>
        <View style={styles.settingsOverlay}>
          <View style={styles.settingsModal}>
            <Text style={styles.settingsTitle}>{t("settings.language")}</Text>
            <TouchableOpacity
              style={styles.settingsOption}
              onPress={() => {
                setLanguage("zh-TW");
                setSettingsVisible(false);
              }}
            >
              <Text style={styles.settingsOptionText}>{t("settings.zh")}</Text>
              {language === "zh-TW" && <View style={styles.settingsCheck} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingsOption}
              onPress={() => {
                setLanguage("en");
                setSettingsVisible(false);
              }}
            >
              <Text style={styles.settingsOptionText}>{t("settings.en")}</Text>
              {language === "en" && <View style={styles.settingsCheck} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingsClose}
              onPress={() => setSettingsVisible(false)}
            >
              <Text style={styles.settingsCloseText}>{t("app.back")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  topHeaderText: {
    gap: 4,
  },
  welcomeLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 1.2,
  },
  welcomeName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0f172a",
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  settingsDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  settingsOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  settingsModal: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 12,
  },
  settingsOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  settingsOptionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
  },
  settingsCheck: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#16a34a",
  },
  settingsClose: {
    marginTop: 12,
    backgroundColor: "#f1f5f9",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  settingsCloseText: {
    color: "#64748b",
    fontSize: 15,
    fontWeight: "600",
  },
  greeting: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
    color: "#1e293b",
    paddingHorizontal: 4,
  },

  // 日期選擇區域
  dateScrollContainer: {
    marginBottom: 24,
    alignItems: "center",
  },

  dateScrollContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  dateItem: {
    width: 54,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  datePressTarget: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  activeDateItem: {
    width: 66,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#16a34a",

    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  todayDateItem: {
    borderColor: "#16a34a",
    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },

  dateWeekday: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94a3b8",
    letterSpacing: 1.2,
  },

  dateDay: {
    fontSize: 19,
    fontWeight: "800",
    marginTop: 2,
    color: "#1f2937",
  },

  activeDateText: {
    color: "#ffffff",
  },

  dateDot: {
    position: "absolute",
    bottom: -7,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#16a34a",
  },

  // 最近紀錄 Section
  historySection: { marginTop: 30 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#1e293b" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16a34a",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  addBtnText: { color: "white", fontSize: 13, fontWeight: "800" },

  // 紀錄卡片
  logCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 16,
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    borderLeftWidth: 4,
  },
  logHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  logName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
    flex: 1,
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeTagText: {
    fontSize: 11,
    fontWeight: "600",
  },
  logSubtitle: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 8,
  },
  macroTags: {
    flexDirection: "row",
    gap: 6,
  },
  macroTag: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 40,
  },
  macroValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1e293b",
  },
  macroLabel: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 2,
  },
  logGrams: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
  },
  logCal: {
    fontWeight: "bold",
    color: "#FF6B6B",
    fontSize: 16,
  },
  logCalUnit: {
    fontSize: 11,
    color: "#94a3b8",
  },
  logRight: {
    flexDirection: "column",
    alignItems: "flex-end",
    justifyContent: "flex-start",
    gap: 6,
  },
  logRightSection: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-between",
    marginLeft: 16,
    gap: 12,
  },
  logDeleteBtnInCard: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ffe5e5",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteBtn: {
    backgroundColor: "#FFE5E5",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: { color: "#94a3b8", fontSize: 14, textAlign: "center" },

  // Modal 樣式
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
    alignItems: "center",
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#0f172a" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 16,
    borderRadius: 16,
    height: 50,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: "#1e293b" },
  templateCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  templateName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  templateInfo: { fontSize: 12, color: "#94a3b8" },
  templateAddCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f0fdf4",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedTemplateName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 20,
  },
  portionContainer: {
    marginBottom: 20,
  },
  portionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
  },
  portionInput: {
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1e293b",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  confirmBtn: {
    backgroundColor: "#16a34a",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  confirmBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "800",
  },
  cancelBtn: {
    backgroundColor: "#f1f5f9",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelBtnText: {
    color: "#64748b",
    fontSize: 16,
    fontWeight: "600",
  },
});
