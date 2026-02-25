import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

export type Language = "zh-TW" | "en";

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const STORAGE_KEY = "foodnote.language";

const translations: Record<Language, Record<string, string>> = {
  "zh-TW": {
    "app.welcomeBack": "歡迎回來",
    "app.greeting": "哈囉！這是你今天的進度",
    "app.recentLogs": "最近紀錄",
    "app.addMeal": "加入餐點",
    "app.emptyLogs": "尚無紀錄",
    "app.deleteRecord": "刪除紀錄",
    "app.deleteConfirm": "確定要刪除「{{title}}」嗎？",
    "app.record": "紀錄",
    "app.cancel": "取消",
    "app.delete": "刪除",
    "app.ingredient": "食材",
    "app.meal": "餐點",
    "app.servings": "份數",
    "app.selectMealTemplate": "選擇餐點模板",
    "app.searchMeals": "搜尋餐點...",
    "app.noTemplates": "找不到符合的模板",
    "app.confirmAdd": "確認新增",
    "app.back": "返回",
    "app.today": "今天",
    "app.kcal": "kcal",

    "nutrition.dailyProgress": "每日進度",
    "nutrition.protein": "蛋白質",
    "nutrition.fat": "脂肪",
    "nutrition.carbs": "碳水",
    "nutrition.caloriesLeft": "還剩熱量",
    "nutrition.caloriesConsumed": "已吃熱量",
    "nutrition.goalHit": "今日目標達成 🔥",
    "nutrition.energy": "能量",
    "nutrition.macronutrients": "宏營養素",
    "nutrition.summary": "營養摘要",

    "ingredient.library": "食材庫",
    "ingredient.addTitle": "新增食材",
    "ingredient.addSubtitle": "自定義食材營養資訊",
    "ingredient.name": "食材名稱",
    "ingredient.nameExample": "例如：雞胸肉",
    "ingredient.calories": "熱量 (kcal)",
    "ingredient.save": "儲存食材",
    "ingredient.recent": "最近食材",
    "ingredient.details": "食材詳情",

    "meals.title": "我的餐點",

    "mealBuilder.editMeal": "編輯餐點",
    "mealBuilder.createMeal": "建立餐點",
    "mealBuilder.addPhoto": "新增照片（可選）",
    "mealBuilder.mealName": "餐點名稱",
    "mealBuilder.mealNamePlaceholder": "例如：香煎雞胸沙拉",
    "mealBuilder.ingredients": "食材",
    "mealBuilder.add": "+ 新增",
    "mealBuilder.noIngredients": "尚未加入食材",
    "mealBuilder.remove": "移除",
    "mealBuilder.totalNutrition": "總營養",
    "mealBuilder.save": "儲存餐點",
    "mealBuilder.search": "搜尋...",

    "scanner.enableCamera": "開啟相機權限",
    "scanner.loading": "查詢中...",
    "scanner.found": "已找到商品",
    "scanner.notFound": "找不到商品",
    "scanner.error": "查詢失敗",
    "scanner.tryAgain": "請稍後再試",
    "scanner.calories100g": "熱量/100g",
    "scanner.goIngredients": "前往食材庫新增",
    "scanner.close": "關閉",
    "scanner.unknownName": "未知品名",
    "scanner.perPackage": "整盒營養",
    "scanner.missingPackage": "缺少份量資訊，請輸入下方數值",
    "scanner.totalPackageGrams": "整盒克數",
    "scanner.servingSize": "每份克數",
    "scanner.servingsPerPack": "每盒份數",
    "scanner.calories": "熱量",
    "scanner.protein": "蛋白質",
    "scanner.fat": "脂肪",
    "scanner.carbs": "碳水",
    "scanner.per100g": "每 100g",
    "scanner.missing100g": "缺少 100g 營養資料",
    "scanner.addIngredient": "加入食材庫",
    "scanner.added": "已加入食材庫",

    "tabs.home": "首頁",
    "tabs.ingredient": "食材",
    "tabs.meals": "餐點",
    "tabs.scan": "掃描",

    "settings.language": "語言",
    "settings.zh": "中文",
    "settings.en": "英文",

    "date.sun": "日",
    "date.mon": "一",
    "date.tue": "二",
    "date.wed": "三",
    "date.thu": "四",
    "date.fri": "五",
    "date.sat": "六",
  },
  en: {
    "app.welcomeBack": "WELCOME BACK",
    "app.greeting": "Hi! Here is your progress today",
    "app.recentLogs": "Recent Logs",
    "app.addMeal": "Add Meal",
    "app.emptyLogs": "No logs yet",
    "app.deleteRecord": "Delete Record",
    "app.deleteConfirm": 'Delete "{{title}}"?',
    "app.record": "Record",
    "app.cancel": "Cancel",
    "app.delete": "Delete",
    "app.ingredient": "Ingredient",
    "app.meal": "Meal",
    "app.servings": "Servings",
    "app.selectMealTemplate": "Select Meal Template",
    "app.searchMeals": "Search meals...",
    "app.noTemplates": "No matching templates",
    "app.confirmAdd": "Confirm",
    "app.back": "Back",
    "app.today": "TODAY",
    "app.kcal": "kcal",

    "nutrition.dailyProgress": "Daily Progress",
    "nutrition.protein": "Protein",
    "nutrition.fat": "Fat",
    "nutrition.carbs": "Carbs",
    "nutrition.caloriesLeft": "Calories Left",
    "nutrition.caloriesConsumed": "Calories Consumed",
    "nutrition.goalHit": "Goal achieved today 🔥",
    "nutrition.energy": "Energy",
    "nutrition.macronutrients": "Macronutrients",
    "nutrition.summary": "Nutrition Summary",

    "ingredient.library": "Ingredients",
    "ingredient.addTitle": "Add Ingredient",
    "ingredient.addSubtitle": "Custom nutrition info",
    "ingredient.name": "Ingredient Name",
    "ingredient.nameExample": "e.g. Chicken Breast",
    "ingredient.calories": "Calories (kcal)",
    "ingredient.save": "Save Ingredient",
    "ingredient.recent": "Recent Foods",
    "ingredient.details": "Ingredient Details",

    "meals.title": "My Meals",

    "mealBuilder.editMeal": "Edit Meal",
    "mealBuilder.createMeal": "Create Meal",
    "mealBuilder.addPhoto": "Add Photo (Optional)",
    "mealBuilder.mealName": "Meal Name",
    "mealBuilder.mealNamePlaceholder": "e.g. Grilled Chicken Salad",
    "mealBuilder.ingredients": "Ingredients",
    "mealBuilder.add": "+ Add",
    "mealBuilder.noIngredients": "No ingredients added yet",
    "mealBuilder.remove": "Remove",
    "mealBuilder.totalNutrition": "Total Nutrition",
    "mealBuilder.save": "Save Meal",
    "mealBuilder.search": "Search...",

    "scanner.enableCamera": "Enable Camera Access",
    "scanner.loading": "Looking up...",
    "scanner.found": "Product Found",
    "scanner.notFound": "Not Found",
    "scanner.error": "Lookup Failed",
    "scanner.tryAgain": "Please try again",
    "scanner.calories100g": "Calories / 100g",
    "scanner.goIngredients": "Go to Ingredients",
    "scanner.close": "Close",
    "scanner.unknownName": "Unknown Product",
    "scanner.perPackage": "Per Package",
    "scanner.missingPackage": "Missing serving info, enter values below",
    "scanner.totalPackageGrams": "Total Package Weight (g)",
    "scanner.servingSize": "Serving size (g)",
    "scanner.servingsPerPack": "Servings per package",
    "scanner.calories": "Calories",
    "scanner.protein": "Protein",
    "scanner.fat": "Fat",
    "scanner.carbs": "Carbs",
    "scanner.per100g": "Per 100g",
    "scanner.missing100g": "Missing 100g nutrition",
    "scanner.addIngredient": "Add to Ingredients",
    "scanner.added": "Added to ingredients",

    "tabs.home": "Home",
    "tabs.ingredient": "Ingredient",
    "tabs.meals": "Meals",
    "tabs.scan": "Scan",

    "settings.language": "Language",
    "settings.zh": "Chinese",
    "settings.en": "English",

    "date.sun": "SUN",
    "date.mon": "MON",
    "date.tue": "TUE",
    "date.wed": "WED",
    "date.thu": "THU",
    "date.fri": "FRI",
    "date.sat": "SAT",
  },
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("zh-TW");

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (isMounted && (value === "zh-TW" || value === "en")) {
          setLanguageState(value);
        }
      })
      .catch(() => {
        // Ignore storage errors and use default language.
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      // Ignore storage errors; language still updates in-memory.
    });
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const value = translations[language][key] ?? key;
      if (!params) return value;
      return Object.keys(params).reduce((acc, paramKey) => {
        return acc.replace(`{{${paramKey}}}`, String(params[paramKey]));
      }, value);
    },
    [language],
  );

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
