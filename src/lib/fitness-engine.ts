// lib/fitness-engine.ts

// --- 1. THE DATABASE ---
export const EXERCISE_DB = [
  { name: "Push Ups", type: "chest", level: "beginner", bad_for: ["shoulder", "wrist"] },
  { name: "Squats", type: "legs", level: "beginner", bad_for: ["knee", "back"] },
  { name: "Deadlift", type: "back", level: "advanced", bad_for: ["back"] },
  { name: "Plank", type: "core", level: "beginner", bad_for: [] },
  { name: "Bench Press", type: "chest", level: "intermediate", bad_for: ["shoulder"] },
  { name: "Lunges", type: "legs", level: "beginner", bad_for: ["knee"] },
  { name: "Pull Ups", type: "back", level: "intermediate", bad_for: ["shoulder"] },
  { name: "Burpees", type: "cardio", level: "intermediate", bad_for: ["knee", "heart"] },
  { name: "Dumbbell Rows", type: "back", level: "beginner", bad_for: ["back"] },
  { name: "Shoulder Press", type: "shoulders", level: "intermediate", bad_for: ["shoulder"] },
  { name: "Mountain Climbers", type: "cardio", level: "beginner", bad_for: ["wrist"] },
  { name: "Leg Press", type: "legs", level: "beginner", bad_for: ["knee"] },
  { name: "Bicep Curls", type: "arms", level: "beginner", bad_for: [] },
  { name: "Tricep Dips", type: "arms", level: "intermediate", bad_for: ["shoulder"] },
  { name: "Russian Twists", type: "core", level: "beginner", bad_for: ["back"] }
];

export const MEAL_DB = [
  { name: "Oatmeal with Whey", type: "breakfast", contains: ["gluten", "dairy"] },
  { name: "Scrambled Eggs & Avocado", type: "breakfast", contains: ["eggs"] },
  { name: "Chicken Salad", type: "lunch", contains: ["meat"] },
  { name: "Grilled Salmon & Rice", type: "dinner", contains: ["fish"] },
  { name: "Vegan Lentil Soup", type: "dinner", contains: ["vegan"] },
  { name: "Steak and Potatoes", type: "dinner", contains: ["meat"] },
  { name: "Greek Yogurt Parfait", type: "breakfast", contains: ["dairy"] },
  { name: "Tofu Stir Fry", type: "lunch", contains: ["soy", "vegan"] },
  { name: "Turkey Wrap", type: "lunch", contains: ["meat", "gluten"] },
  { name: "Protein Smoothie", type: "breakfast", contains: ["dairy"] }
];

// --- 2. HELPER: TEXT TO NUMBER PARSER ---
function parseDaysInput(input: string | number): number {
  if (typeof input === "number") return input;
  if (!input) return 3;

  const text = input.toString().toLowerCase().trim();
  
  // 1. Try finding a digit (e.g., "I want 4 days")
  const digitMatch = text.match(/\d+/);
  if (digitMatch) {
    const num = parseInt(digitMatch[0]);
    if (!isNaN(num) && num > 0 && num <= 7) return num;
  }

  // 2. Map words to numbers
  const wordMap: { [key: string]: number } = {
    "one": 1, "single": 1,
    "two": 2, "couple": 2,
    "three": 3, "few": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7, "week": 7, "every": 7
  };

  for (const [word, val] of Object.entries(wordMap)) {
    if (text.includes(word)) return val;
  }

  // Default fallback
  return 3;
}

// --- 3. CALCULATOR ---
export function calculateCalories(weight: number, height: number, age: number, gender: string, goal: string) {
  // Mifflin-St Jeor Equation
  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  bmr += gender.toLowerCase() === 'male' ? 5 : -161;
  
  const maintenance = Math.round(bmr * 1.55); // Moderate activity multiplier
  
  let target = maintenance;
  if (goal.toLowerCase().includes("lose")) target -= 500;
  else if (goal.toLowerCase().includes("gain") || goal.toLowerCase().includes("muscle")) target += 300;
  
  return target;
}

// --- 4. MAIN GENERATOR FUNCTION ---
export function generateProgramLogic(userData: any) {
  // Destructure with defaults
  const { 
    goal = "maintain", 
    days, 
    level = "beginner", 
    allergies = "none", 
    injuries = "none", 
    age = 25, 
    weight = 75, 
    height = 175, 
    gender = 'male' 
  } = userData;

  // --- A. Parse Duration ---
  const numDays = parseDaysInput(days);

  // --- B. Filter Exercises ---
  let safeExercises = EXERCISE_DB.filter(ex => {
    // Injury check
    if (injuries && !injuries.toLowerCase().includes("none") && !injuries.toLowerCase().includes("no")) {
      const injuryList = injuries.toLowerCase().split(/[ ,]+/);
      const isBad = ex.bad_for.some(bad => injuryList.includes(bad));
      if (isBad) return false;
    }
    // Level check: If user is beginner, hide advanced.
    if (level.toLowerCase().includes('beginner') && ex.level === 'advanced') return false;
    
    return true;
  });

  // Fallback: If filtering removed everything, use Core/Cardio
  if (safeExercises.length < 4) {
      safeExercises = EXERCISE_DB.filter(ex => ex.type === 'core' || ex.type === 'cardio');
  }

  // --- C. Build Workout Schedule ---
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const planExercises = [];

  for (let i = 0; i < numDays; i++) {
    const dayLabel = i < 7 ? dayNames[i] : `Day ${i + 1}`;
    const shuffled = [...safeExercises].sort(() => 0.5 - Math.random());
    
    // Pick top 4 exercises
    const selectedForDay = shuffled.slice(0, 4).map(ex => ({
        name: ex.name,
        sets: 3,
        // NOW USING RANGES: Because we updated Schema to allow strings!
        reps: goal.toLowerCase().includes("muscle") ? "8-12" : "12-15", 
        description: `Focus: ${ex.type.charAt(0).toUpperCase() + ex.type.slice(1)}`
    }));

    planExercises.push({
        day: dayLabel,
        routines: selectedForDay
    });
  }

  // --- D. Filter Meals ---
  const safeMeals = MEAL_DB.filter(meal => {
    if (allergies && !allergies.toLowerCase().includes("none") && !allergies.toLowerCase().includes("no")) {
        const allergyList = allergies.toLowerCase().split(/[ ,]+/);
        const hasAllergy = meal.contains.some(c => allergyList.includes(c));
        if (hasAllergy) return false;
    }
    return true;
  });
  
  const finalMealsList = safeMeals.length > 0 ? safeMeals : MEAL_DB;

  // --- E. Build Diet ---
  const calories = calculateCalories(Number(weight), Number(height), Number(age), gender, goal);
  
  const getMeal = (type: string) => {
      const options = finalMealsList.filter(m => m.type === type);
      if (options.length > 0) return options[Math.floor(Math.random() * options.length)];
      return { name: "Balanced Option", contains: [] };
  };

  const planMeals = [
      { name: "Breakfast", foods: [getMeal('breakfast').name] },
      { name: "Lunch", foods: [getMeal('lunch').name] },
      { name: "Dinner", foods: [getMeal('dinner').name] }
  ];

  // --- F. Return Structure ---
  const scheduleList = planExercises.map(p => p.day);

  return {
      workoutPlan: { 
          schedule: scheduleList, 
          exercises: planExercises 
      },
      dietPlan: { 
          dailyCalories: calories, 
          meals: planMeals 
      }
  };
}