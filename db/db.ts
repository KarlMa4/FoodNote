import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("macro.db");

function ensureMealsSchema() {
  const columns = db.getAllSync<{ name: string }>("PRAGMA table_info(meals)");

  const hasType = columns.some((col) => col.name === "type");
  const hasTemplateId = columns.some((col) => col.name === "meal_template_id");
  const hasPortion = columns.some((col) => col.name === "portion");

  if (!hasType) {
    db.execSync("ALTER TABLE meals ADD COLUMN type TEXT DEFAULT 'ingredient'");
    db.execSync("UPDATE meals SET type = 'ingredient' WHERE type IS NULL");
  }

  if (!hasTemplateId) {
    db.execSync("ALTER TABLE meals ADD COLUMN meal_template_id INTEGER");
  }

  if (!hasPortion) {
    db.execSync("ALTER TABLE meals ADD COLUMN portion REAL DEFAULT 1.0");
    db.execSync("UPDATE meals SET portion = 1.0 WHERE portion IS NULL");
  }

  const refreshedColumns = db.getAllSync<{
    name: string;
    notnull: number;
  }>("PRAGMA table_info(meals)");
  const ingredientColumn = refreshedColumns.find(
    (col) => col.name === "ingredient_id",
  );
  const mealsTable = db.getFirstSync<{ sql: string }>(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'meals'",
  );
  const hasIngredientNotNull =
    mealsTable?.sql?.toLowerCase().includes("ingredient_id integer not null") ??
    false;

  if (ingredientColumn?.notnull || hasIngredientNotNull) {
    db.execSync("PRAGMA foreign_keys=OFF");
    db.execSync(`
      CREATE TABLE IF NOT EXISTS meals_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'ingredient',
        ingredient_id INTEGER,
        meal_template_id INTEGER,
        grams REAL,
        portion REAL DEFAULT 1.0,
        calories REAL,
        protein REAL,
        fat REAL,
        carbs REAL,
        FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
        FOREIGN KEY (meal_template_id) REFERENCES meal_templates(id)
      );
    `);

    db.execSync(`
      INSERT INTO meals_new (
        id,
        date,
        type,
        ingredient_id,
        meal_template_id,
        grams,
        portion,
        calories,
        protein,
        fat,
        carbs
      )
      SELECT
        id,
        date,
        COALESCE(type, 'ingredient'),
        ingredient_id,
        meal_template_id,
        grams,
        COALESCE(portion, 1.0),
        calories,
        protein,
        fat,
        carbs
      FROM meals;
    `);

    db.execSync("DROP TABLE meals");
    db.execSync("ALTER TABLE meals_new RENAME TO meals");
    db.execSync("PRAGMA foreign_keys=ON");
  }
}

/* =========================
   TABLE SETUP
========================= */

// // 開發時可用（會清空資料）
// db.execSync(`DROP TABLE IF EXISTS meal_template_ingredients;`);
// db.execSync(`DROP TABLE IF EXISTS meal_templates;`);
// db.execSync(`DROP TABLE IF EXISTS meals;`);
// db.execSync(`DROP TABLE IF EXISTS ingredients;`);

db.execSync(`
CREATE TABLE IF NOT EXISTS ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  barcode TEXT UNIQUE,
  name TEXT,
  calories_100g REAL,
  protein_100g REAL,
  fat_100g REAL,
  carbs_100g REAL,
  serving_size_g REAL,
  servings_per_package REAL
);
`);

db.execSync(`
CREATE TABLE IF NOT EXISTS meal_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`);

db.execSync(`
CREATE TABLE IF NOT EXISTS meal_template_ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL,
  ingredient_id INTEGER NOT NULL,
  grams REAL NOT NULL,
  FOREIGN KEY (template_id) REFERENCES meal_templates(id),
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
);
`);

db.execSync(`
CREATE TABLE IF NOT EXISTS meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'ingredient',
  ingredient_id INTEGER,
  meal_template_id INTEGER,
  grams REAL,
  portion REAL DEFAULT 1.0,
  calories REAL,
  protein REAL,
  fat REAL,
  carbs REAL,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
  FOREIGN KEY (meal_template_id) REFERENCES meal_templates(id)
);
`);

ensureMealsSchema();

/* =========================
   TYPES
========================= */

export interface Ingredient {
  id: number;
  barcode: string;
  name: string;
  calories_100g: number;
  protein_100g: number;
  fat_100g: number;
  carbs_100g: number;
  serving_size_g?: number | null;
  servings_per_package?: number | null;
}

export interface MealTemplateItem {
  ingredient_id: number;
  grams: number;
  name?: string;
  calories_100g?: number;
  protein_100g?: number;
  fat_100g?: number;
  carbs_100g?: number;
  serving_size_g?: number | null;
}

export interface MealTemplate {
  id: number;
  name: string;
  created_at: string;
  items: MealTemplateItem[];
}

export interface MealRecord {
  id: number;
  date: string;
  type: string; // 'ingredient' or 'meal'
  ingredient_id?: number | null;
  meal_template_id?: number | null;
  grams?: number | null;
  portion: number; // 1.0 = full, 0.5 = half
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  title?: string; // ingredient name or meal template name
}

export interface MealInput {
  date: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs?: number;
  carbos?: number;
}

/* =========================
   INGREDIENT FUNCTIONS
========================= */

export function insertIngredient(data: any) {
  db.runSync(
    `INSERT OR IGNORE INTO ingredients
     (barcode, name, calories_100g, protein_100g, fat_100g, carbs_100g,
      serving_size_g, servings_per_package)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.barcode,
      data.name,
      data.calories_100g,
      data.protein_100g,
      data.fat_100g,
      data.carbs_100g,
      data.serving_size_g ?? null,
      data.servings_per_package ?? null,
    ],
  );
}

export function getAllIngredients(): Ingredient[] {
  return db.getAllSync<Ingredient>(
    `SELECT * FROM ingredients ORDER BY id DESC`,
  );
}

export function getIngredientById(id: number): Ingredient | null {
  return (
    db.getFirstSync<Ingredient>(`SELECT * FROM ingredients WHERE id = ?`, [
      id,
    ]) ?? null
  );
}

export function deleteIngredient(id: number) {
  db.runSync(`DELETE FROM ingredients WHERE id = ?`, [id]);
}

/* =========================
   MEAL TEMPLATE FUNCTIONS
========================= */

export function createMealTemplate(
  name: string,
  items: { ingredient_id: number; grams: number }[],
) {
  const now = new Date().toISOString();

  const result = db.runSync(
    `INSERT INTO meal_templates (name, created_at)
     VALUES (?, ?)`,
    [name, now],
  );

  const templateId = result.lastInsertRowId;

  for (const item of items) {
    db.runSync(
      `INSERT INTO meal_template_ingredients
       (template_id, ingredient_id, grams)
       VALUES (?, ?, ?)`,
      [templateId, item.ingredient_id, item.grams],
    );
  }
}

export function updateMealTemplate(
  templateId: number,
  name: string,
  items: { ingredient_id: number; grams: number }[],
) {
  db.runSync(`UPDATE meal_templates SET name = ? WHERE id = ?`, [
    name,
    templateId,
  ]);

  db.runSync(`DELETE FROM meal_template_ingredients WHERE template_id = ?`, [
    templateId,
  ]);

  for (const item of items) {
    db.runSync(
      `INSERT INTO meal_template_ingredients
       (template_id, ingredient_id, grams)
       VALUES (?, ?, ?)`,
      [templateId, item.ingredient_id, item.grams],
    );
  }
}

export function deleteMealTemplate(id: number) {
  db.runSync(`DELETE FROM meal_template_ingredients WHERE template_id = ?`, [
    id,
  ]);

  db.runSync(`DELETE FROM meal_templates WHERE id = ?`, [id]);
}

export function getAllMealTemplates(): MealTemplate[] {
  const templates = db.getAllSync<any>(
    `SELECT * FROM meal_templates ORDER BY id DESC`,
  );

  return templates.map((t: any) => {
    const items = db.getAllSync<any>(
      `SELECT 
          mti.ingredient_id,
          mti.grams,
          i.name,
          i.calories_100g,
          i.protein_100g,
          i.fat_100g,
          i.carbs_100g,
          i.serving_size_g
       FROM meal_template_ingredients mti
       JOIN ingredients i ON i.id = mti.ingredient_id
       WHERE mti.template_id = ?
       ORDER BY mti.id ASC`,
      [t.id],
    );

    return { ...t, items };
  });
}

/* =========================
   MEAL RECORD (LOG)
========================= */

export function addMealFromIngredient(params: {
  date: string;
  ingredient: Ingredient;
  grams: number;
}) {
  const { date, ingredient, grams } = params;
  const multiplier = grams / 100;

  db.runSync(
    `INSERT INTO meals
     (date, type, ingredient_id, grams, portion, calories, protein, fat, carbs)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      date,
      "ingredient",
      ingredient.id,
      grams,
      1.0,
      ingredient.calories_100g * multiplier,
      ingredient.protein_100g * multiplier,
      ingredient.fat_100g * multiplier,
      ingredient.carbs_100g * multiplier,
    ],
  );
}

export function addIngredientFromMealInput(input: MealInput) {
  const carbs = Number(input.carbs ?? input.carbos ?? 0);
  const calories = Number(input.calories) || 0;
  const protein = Number(input.protein) || 0;
  const fat = Number(input.fat) || 0;
  const name = input.name?.trim() || "Custom Food";
  const barcode = `custom-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

  db.runSync(
    `INSERT INTO ingredients
     (barcode, name, calories_100g, protein_100g, fat_100g, carbs_100g, serving_size_g, servings_per_package)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [barcode, name, calories, protein, fat, carbs, 100, 1],
  );
}

export function addMeal(input: MealInput) {
  const carbs = Number(input.carbs ?? input.carbos ?? 0);
  const calories = Number(input.calories) || 0;
  const protein = Number(input.protein) || 0;
  const fat = Number(input.fat) || 0;
  const name = input.name?.trim() || "Custom Food";
  const barcode = `custom-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

  const ingredientResult = db.runSync(
    `INSERT INTO ingredients
     (barcode, name, calories_100g, protein_100g, fat_100g, carbs_100g, serving_size_g, servings_per_package)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [barcode, name, calories, protein, fat, carbs, 100, 1],
  );

  const ingredientId = Number(ingredientResult.lastInsertRowId);

  db.runSync(
    `INSERT INTO meals
     (date, type, ingredient_id, grams, portion, calories, protein, fat, carbs)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.date,
      "ingredient",
      ingredientId,
      100,
      1.0,
      calories,
      protein,
      fat,
      carbs,
    ],
  );
}

export function addMealFromTemplate(params: {
  date: string;
  templateId: number;
  portion?: number;
}) {
  const template = getAllMealTemplates().find(
    (t) => t.id === params.templateId,
  );

  if (!template) return;

  const portion = params.portion ?? 1.0;

  // 計算 template 的總營養
  const nutrition = calcTemplateNutrition(template.items);

  // 只加一筆紀錄，type='meal'
  db.runSync(
    `INSERT INTO meals
     (date, type, meal_template_id, portion, calories, protein, fat, carbs)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      params.date,
      "meal",
      params.templateId,
      portion,
      nutrition.calories * portion,
      nutrition.protein * portion,
      nutrition.fat * portion,
      nutrition.carbs * portion,
    ],
  );
}

export function deleteMeal(id: number) {
  db.runSync(`DELETE FROM meals WHERE id = ?`, [id]);
}

export function getMealsByDate(date: string): MealRecord[] {
  return db.getAllSync<MealRecord>(
    `SELECT 
      m.id, m.date, m.type, m.ingredient_id, m.meal_template_id, 
      m.grams, m.portion, m.calories, m.protein, m.fat, m.carbs,
      COALESCE(i.name, mt.name) as title
     FROM meals m
     LEFT JOIN ingredients i ON m.type = 'ingredient' AND m.ingredient_id = i.id
     LEFT JOIN meal_templates mt ON m.type = 'meal' AND m.meal_template_id = mt.id
     WHERE m.date = ?
     ORDER BY m.id DESC`,
    [date],
  );
}

export function getDailyTotal(date: string) {
  return (
    db.getFirstSync<any>(
      `SELECT 
        COALESCE(SUM(calories * portion), 0) as calories,
        COALESCE(SUM(protein * portion), 0) as protein,
        COALESCE(SUM(fat * portion), 0) as fat,
        COALESCE(SUM(carbs * portion), 0) as carbs
       FROM meals
       WHERE date = ?`,
      [date],
    ) ?? { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );
}

/* =========================
   NUTRITION HELPERS
========================= */

export function calcTemplateNutrition(items: MealTemplateItem[]) {
  let calories = 0;
  let protein = 0;
  let fat = 0;
  let carbs = 0;

  for (const it of items) {
    const grams = Number(it.grams) || 0;
    const servingSize = Number(it.serving_size_g) || 100;
    const mul = grams / servingSize;

    calories += (Number(it.calories_100g) || 0) * mul;
    protein += (Number(it.protein_100g) || 0) * mul;
    fat += (Number(it.fat_100g) || 0) * mul;
    carbs += (Number(it.carbs_100g) || 0) * mul;
  }

  return { calories, protein, fat, carbs };
}
