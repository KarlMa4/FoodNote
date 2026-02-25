// foodApi.ts

export interface FoodData {
  name: string;
  protein: number;
  calories: number;
  fat: number;
  carbs: number;
  brand?: string;
}

export const fetchFoodByBarcode = async (barcode: string) => {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
    );

    if (!response.ok) {
      return { success: false, barcode };
    }

    const result = await response.json();

    if (result.status === 1 && result.product) {
      const p = result.product;

      return {
        success: true,
        data: {
          name: p.product_name_zh || p.product_name || "未知食物",
          protein: Number(p.nutriments?.proteins_100g) || 0,
          calories: Number(p.nutriments?.["energy-kcal_100g"]) || 0,
          fat: Number(p.nutriments?.fat_100g) || 0,
          carbs: Number(p.nutriments?.carbohydrates_100g) || 0,
          brand: p.brands || "",
        } as FoodData,
      };
    }

    return { success: false, barcode };
  } catch (error) {
    console.error("API Error:", error);
    return { success: false, barcode };
  }
};
