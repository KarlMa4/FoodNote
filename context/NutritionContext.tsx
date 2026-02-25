import {
    addIngredientFromMealInput,
    getDailyTotal,
    getMealsByDate,
    MealInput,
    MealRecord,
} from "@/db/db";
import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from "react";

type FoodLog = MealRecord;

interface NutritionContextType {
  logs: FoodLog[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  addFood: (food: Omit<MealInput, "date">) => void;
  reload: () => void;
}

const NutritionContext = createContext<NutritionContextType | undefined>(
  undefined,
);

export function NutritionProvider({ children }: { children: ReactNode }) {
  const today = new Date().toISOString().split("T")[0];

  const [selectedDate, setSelectedDate] = useState(today);
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [totals, setTotals] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });

  const reload = () => {
    const meals = getMealsByDate(selectedDate);
    const total = getDailyTotal(selectedDate);

    setLogs(meals || []);
    setTotals(total || { calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  useEffect(() => {
    reload();
  }, [selectedDate]);

  const addFood = (food: Omit<MealInput, "date">) => {
    addIngredientFromMealInput({
      ...food,
      date: selectedDate,
    });
    reload();
  };

  return (
    <NutritionContext.Provider
      value={{
        logs,
        totals,
        selectedDate,
        setSelectedDate,
        addFood,
        reload,
      }}
    >
      {children}
    </NutritionContext.Provider>
  );
}

export const useNutrition = () => {
  const context = useContext(NutritionContext);
  if (!context)
    throw new Error("useNutrition must be used within NutritionProvider");
  return context;
};
