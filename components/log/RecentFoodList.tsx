// components/log/RecentFoodList.tsx

import { useLanguage } from "@/context/LanguageContext";
import { Trash2 } from "lucide-react-native";
import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export interface RecentFoodItem {
  id?: number;
  name: string;
  calories: number;
  protein?: number;
  fat?: number;
  carbos?: number;
  calories_100g?: number;
  protein_100g?: number;
  fat_100g?: number;
  carbs_100g?: number;
}

interface Props {
  foods: RecentFoodItem[];
  onDetail?: (food: RecentFoodItem) => void;
  onDelete?: (index: number, food: RecentFoodItem) => void;
}

export default function RecentFoodList({ foods, onDetail, onDelete }: Props) {
  const { t } = useLanguage();

  return (
    <View>
      <Text style={styles.sectionTitle}>{t("ingredient.recent")}</Text>

      {foods.map((item, index) => (
        <FoodItem
          key={`${item.id}-${index}`}
          index={index}
          item={item}
          onPress={() => onDetail?.(item)}
          onDelete={() => onDelete?.(index, item)}
        />
      ))}
    </View>
  );
}

interface FoodItemProps {
  item: RecentFoodItem;
  index: number;
  onPress: () => void;
  onDelete: () => void;
}

function FoodItem({ item, onPress, onDelete }: FoodItemProps) {
  const handleDelete = () => {
    Alert.alert("刪除食材", `確定要刪除「${item.name}」嗎？`, [
      { text: "取消", style: "cancel" },
      {
        text: "刪除",
        style: "destructive",
        onPress: onDelete,
      },
    ]);
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardContent}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.calories}>{item.calories} kcal</Text>
      </View>

      <TouchableOpacity
        style={styles.deleteBtnInCard}
        onPress={handleDelete}
        activeOpacity={0.7}
      >
        <Trash2 size={16} color="#ef4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#94a3b8",
    marginBottom: 10,
    marginTop: 10,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFF",
    borderRadius: 20,
    marginBottom: 10,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  cardContent: {
    flex: 1,
  },

  name: {
    fontWeight: "600",
    fontSize: 15,
    color: "#0f172a",
  },

  calories: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },

  deleteBtnInCard: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ffe5e5",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
});
