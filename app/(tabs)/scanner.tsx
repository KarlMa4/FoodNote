import { useLanguage } from "@/context/LanguageContext";
import { insertIngredient } from "@/db/db";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import {
    BarcodeScanningResult,
    CameraView,
    useCameraPermissions,
} from "expo-camera";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
    Linking,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type LookupResult =
  | { status: "idle" | "loading" }
  | {
      status: "found";
      barcode: string;
      name: string;
      calories100g?: number;
      product: Record<string, any>;
    }
  | { status: "not_found"; barcode: string }
  | { status: "error"; barcode: string };

const parseNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const match = value.match(/[\d.]+/);
    if (!match) return undefined;
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const roundTo2 = (value: number) => Math.round(value * 100) / 100;

const computePerPackage = (params: {
  per100g: {
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
  };
  totalGrams?: number;
  inputServingSize?: number;
  inputServings?: number;
}) => {
  const { per100g, totalGrams, inputServingSize, inputServings } = params;

  const hasPer100g =
    per100g.calories !== undefined ||
    per100g.protein !== undefined ||
    per100g.fat !== undefined ||
    per100g.carbs !== undefined;

  // Priority 1: Use product_quantity (total grams) if available
  if (hasPer100g && totalGrams) {
    const mul = totalGrams / 100;
    return {
      calories: (per100g.calories ?? 0) * mul,
      protein: (per100g.protein ?? 0) * mul,
      fat: (per100g.fat ?? 0) * mul,
      carbs: (per100g.carbs ?? 0) * mul,
    };
  }

  // Priority 2: Use serving size + servings if available
  if (hasPer100g && inputServingSize && inputServings) {
    const mul = (inputServingSize / 100) * inputServings;
    return {
      calories: (per100g.calories ?? 0) * mul,
      protein: (per100g.protein ?? 0) * mul,
      fat: (per100g.fat ?? 0) * mul,
      carbs: (per100g.carbs ?? 0) * mul,
    };
  }

  return undefined;
};

const computePer100gFromServing = (params: {
  perServing: {
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
  };
  servingSize?: number;
}) => {
  const { perServing, servingSize } = params;
  if (!servingSize || servingSize <= 0) return undefined;
  const mul = 100 / servingSize;
  return {
    calories: (perServing.calories ?? 0) * mul,
    protein: (perServing.protein ?? 0) * mul,
    fat: (perServing.fat ?? 0) * mul,
    carbs: (perServing.carbs ?? 0) * mul,
  };
};

export default function BarcodeScanner() {
  const { t } = useLanguage();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const isFocused = useIsFocused();
  const [result, setResult] = useState<LookupResult>({ status: "idle" });
  const [modalVisible, setModalVisible] = useState(false);
  const [totalGramsInput, setTotalGramsInput] = useState("");

  // 🔥 用 ref 當真正的掃描鎖
  const scanningRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      scanningRef.current = false;
    }, []),
  );

  const handleScan = async (result: BarcodeScanningResult) => {
    if (scanningRef.current) return;

    scanningRef.current = true;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const barcode = result.data;
    setResult({ status: "loading" });
    setModalVisible(true);

    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      );
      const data = await response.json();

      if (data?.status === 1 && data?.product) {
        const product = data.product;
        const name =
          product.product_name ||
          product.product_name_en ||
          t("scanner.unknownName");
        const nutriments = product.nutriments || {};
        const calories100g = Number(
          nutriments["energy-kcal_100g"] ?? nutriments["energy-kcal"],
        );
        const totalGramsGuess = parseNumber(product.product_quantity);

        setTotalGramsInput(
          totalGramsGuess !== undefined ? String(totalGramsGuess) : "",
        );

        setResult({
          status: "found",
          barcode,
          name,
          calories100g: Number.isFinite(calories100g)
            ? calories100g
            : undefined,
          product,
        });
      } else {
        setResult({ status: "not_found", barcode });
      }
    } finally {
      // 🔥 延遲解鎖
      setTimeout(() => {
        scanningRef.current = false;
      }, 1500);
    }
  };

  const resultContent = useMemo(() => {
    if (result.status === "loading") {
      return <Text style={styles.modalTitle}>{t("scanner.loading")}</Text>;
    }

    if (result.status === "error") {
      return (
        <>
          <Text style={styles.modalTitle}>{t("scanner.error")}</Text>
          <Text style={styles.modalSubtitle}>{t("scanner.tryAgain")}</Text>
        </>
      );
    }

    if (result.status === "not_found") {
      return (
        <>
          <Text style={styles.modalTitle}>{t("scanner.notFound")}</Text>
          <Text style={styles.modalSubtitle}>{result.barcode}</Text>
          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => router.replace("/ingredient")}
          >
            <Text style={styles.modalButtonText}>
              {t("scanner.goIngredients")}
            </Text>
          </TouchableOpacity>
        </>
      );
    }

    if (result.status === "found") {
      const nutriments = result.product.nutriments || {};
      const per100g = {
        calories: parseNumber(
          nutriments["energy-kcal_100g"] ?? nutriments["energy-kcal"],
        ),
        protein: parseNumber(nutriments["proteins_100g"]),
        fat: parseNumber(nutriments["fat_100g"]),
        carbs: parseNumber(nutriments["carbohydrates_100g"]),
      };
      const perServing = {
        calories: parseNumber(
          nutriments["energy-kcal_serving"] ?? nutriments["energy-kcal"],
        ),
        protein: parseNumber(nutriments["proteins_serving"]),
        fat: parseNumber(nutriments["fat_serving"]),
        carbs: parseNumber(nutriments["carbohydrates_serving"]),
      };
      const totalGrams =
        parseNumber(result.product.product_quantity) ||
        parseNumber(totalGramsInput);
      const servingSizeFromProduct = parseNumber(result.product.serving_size);
      const per100gFromServing = computePer100gFromServing({
        perServing,
        servingSize: servingSizeFromProduct,
      });
      const basePer100g = {
        calories: per100g.calories ?? per100gFromServing?.calories,
        protein: per100g.protein ?? per100gFromServing?.protein,
        fat: per100g.fat ?? per100gFromServing?.fat,
        carbs: per100g.carbs ?? per100gFromServing?.carbs,
      };
      const hasBase100g =
        basePer100g.calories !== undefined ||
        basePer100g.protein !== undefined ||
        basePer100g.fat !== undefined ||
        basePer100g.carbs !== undefined;

      const perPackage = computePerPackage({
        per100g: basePer100g,
        totalGrams,
      });
      const needsInputs =
        !parseNumber(result.product.product_quantity) && hasBase100g;
      return (
        <>
          <Text style={styles.modalTitle}>{t("scanner.found")}</Text>
          <Text style={styles.modalName}>{result.name}</Text>
          <Text style={styles.modalSubtitle}>{result.barcode}</Text>

          <Text style={styles.modalSectionLabel}>
            {t("scanner.per100g")}（原始標示）
          </Text>
          {hasBase100g ? (
            <View style={styles.nutritionGrid}>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionLabel}>
                  {t("scanner.calories")}
                </Text>
                <Text style={styles.nutritionValue}>
                  {Math.round(basePer100g.calories ?? 0)}
                </Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionLabel}>
                  {t("scanner.protein")}
                </Text>
                <Text style={styles.nutritionValue}>
                  {Math.round(basePer100g.protein ?? 0)}
                </Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionLabel}>{t("scanner.fat")}</Text>
                <Text style={styles.nutritionValue}>
                  {Math.round(basePer100g.fat ?? 0)}
                </Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionLabel}>{t("scanner.carbs")}</Text>
                <Text style={styles.nutritionValue}>
                  {Math.round(basePer100g.carbs ?? 0)}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.modalSubtitle}>{t("scanner.missing100g")}</Text>
          )}

          <Text style={styles.modalSectionLabel}>
            {t("scanner.perPackage")}（會儲存）
          </Text>
          {perPackage ? (
            <View style={styles.nutritionGrid}>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionLabel}>
                  {t("scanner.calories")}
                </Text>
                <Text style={styles.nutritionValue}>
                  {Math.round(perPackage.calories)}
                </Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionLabel}>
                  {t("scanner.protein")}
                </Text>
                <Text style={styles.nutritionValue}>
                  {Math.round(perPackage.protein)}
                </Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionLabel}>{t("scanner.fat")}</Text>
                <Text style={styles.nutritionValue}>
                  {Math.round(perPackage.fat)}
                </Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionLabel}>{t("scanner.carbs")}</Text>
                <Text style={styles.nutritionValue}>
                  {Math.round(perPackage.carbs)}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.modalSubtitle}>
              {t("scanner.missingPackage")}
            </Text>
          )}

          {needsInputs && (
            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t("scanner.totalPackageGrams")}
                </Text>
                <TextInput
                  style={styles.input}
                  value={totalGramsInput}
                  onChangeText={setTotalGramsInput}
                  keyboardType="decimal-pad"
                  placeholder="g"
                />
              </View>
            </View>
          )}

          {hasBase100g && (
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                const totalGramsForSave =
                  parseNumber(result.product.product_quantity) ||
                  parseNumber(totalGramsInput) ||
                  100;
                const multiplier = totalGramsForSave / 100;

                insertIngredient({
                  barcode: result.barcode,
                  name: result.name,
                  calories_100g: roundTo2(
                    (basePer100g.calories ?? 0) * multiplier,
                  ),
                  protein_100g: roundTo2(
                    (basePer100g.protein ?? 0) * multiplier,
                  ),
                  fat_100g: roundTo2((basePer100g.fat ?? 0) * multiplier),
                  carbs_100g: roundTo2((basePer100g.carbs ?? 0) * multiplier),
                  serving_size_g: roundTo2(totalGramsForSave),
                  servings_per_package: 1,
                });
                setModalVisible(false);
                setResult({ status: "idle" });
              }}
            >
              <Text style={styles.modalButtonText}>
                {t("scanner.addIngredient")}
              </Text>
            </TouchableOpacity>
          )}
        </>
      );
    }

    return null;
  }, [result, router, totalGramsInput, t]);

  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <TouchableOpacity
          style={styles.btn}
          onPress={
            permission.canAskAgain
              ? requestPermission
              : () => Linking.openSettings()
          }
        >
          <Text style={{ color: "#fff" }}>{t("scanner.enableCamera")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isFocused && (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={{
            barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"],
          }}
          onBarcodeScanned={handleScan}
        />
      )}

      <View style={styles.scanFrame} />

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <ScrollView contentContainerStyle={styles.modalBody}>
              <View style={styles.modalCard}>{resultContent}</View>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => {
                setModalVisible(false);
                setResult({ status: "idle" });
              }}
            >
              <Text style={styles.modalCloseText}>{t("scanner.close")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  btn: { backgroundColor: "#007AFF", padding: 15, borderRadius: 10 },
  scanFrame: {
    position: "absolute",
    top: "35%",
    alignSelf: "center",
    width: 250,
    height: 150,
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#f8fafc",
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    marginBottom: 0,
  },
  modalHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#e2e8f0",
    marginBottom: 12,
  },
  modalBody: {
    paddingBottom: 12,
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 10,
  },
  modalName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 12,
  },
  modalMeta: {
    fontSize: 13,
    color: "#1e293b",
    marginBottom: 14,
  },
  modalSectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  nutritionItem: {
    backgroundColor: "#f1f5f9",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 96,
  },
  nutritionLabel: {
    fontSize: 11,
    color: "#94a3b8",
    marginBottom: 6,
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  modalButton: {
    backgroundColor: "#f1f5f9",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  modalClose: {
    backgroundColor: "#16a34a",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalCloseText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
