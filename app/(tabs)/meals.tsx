import { useLanguage } from "@/context/LanguageContext";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { Trash2 } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    calcTemplateNutrition,
    deleteMealTemplate,
    getAllMealTemplates,
} from "../../db/db";

export default function MealsPage() {
  const { t } = useLanguage();
  const [templates, setTemplates] = useState<any[]>([]);

  const load = () => {
    setTemplates(getAllMealTemplates());
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  const handleDelete = (item: any) => {
    deleteMealTemplate(item.id);
    load();
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.title}>{t("meals.title")}</Text>
          <TouchableOpacity
            onPress={() => router.push("/meal-builder")}
            style={s.plus}
          >
            <Ionicons name="add" size={22} color="white" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={templates}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            const nutrition = calcTemplateNutrition(item.items || []);
            return (
              <MealItem
                item={item}
                nutrition={nutrition}
                onPress={() =>
                  router.push({
                    pathname: "/meal-builder",
                    params: { id: item.id },
                  })
                }
                onDelete={() => handleDelete(item)}
              />
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
}

interface MealItemProps {
  item: any;
  nutrition: any;
  onPress: () => void;
  onDelete: () => void;
}

function MealItem({ item, nutrition, onPress, onDelete }: MealItemProps) {
  const handleDelete = () => {
    Alert.alert("刪除方案", `確定要刪除「${item.name}」嗎？`, [
      { text: "取消", style: "cancel" },
      {
        text: "刪除",
        style: "destructive",
        onPress: onDelete,
      },
    ]);
  };

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.7}>
      <View style={s.cardContent}>
        <Text style={s.cardTitle}>{item.name}</Text>
        <Text style={s.kcal}>{nutrition.calories.toFixed(0)} kcal</Text>
      </View>

      <TouchableOpacity
        style={s.deleteBtnInCard}
        onPress={handleDelete}
        activeOpacity={0.7}
      >
        <Trash2 size={16} color="#ef4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fafaf9" },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
  },
  title: { fontSize: 22, fontWeight: "800" },
  plus: {
    width: 40,
    height: 40,
    backgroundColor: "#22c55e",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: { fontWeight: "800", fontSize: 16, color: "#0f172a" },
  kcal: { marginTop: 4, color: "#64748b", fontSize: 13 },
  deleteBtnInCard: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffe5e5",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
});
