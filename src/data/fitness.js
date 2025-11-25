export const SAMPLE_WORKOUTS = [
  {
    id: "shape-ignite",
    name: "Shape Ignite",
    goal: "Hipertrofia",
    level: "Intermediário",
    focus: "Full body",
    durationMinutes: 55,
    tempo: "4 semanas",
    days: ["Seg", "Qua", "Sex"],
    summary: "Bloco híbrido com ênfase em grandes básicos e acessórios metabólicos para manter o ritmo cardíaco elevado.",
    thumbnail: "https://images.unsplash.com/photo-1558611848-73f7eb4001a1?auto=format&fit=crop&w=800&q=80",
    heroVídeo: "https://storage.googleapis.com/fitness-assets/meu-shape/shape-ignite-demo.mp4",
    coverImage: "https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&w=1600&q=80",
    equipment: ["Barra", "Halteres", "Corda naval", "Bike erg"],
    metrics: {
      weeklyVolumeKg: 14850,
      estimatedCalories: 520,
      sessionsPerWeek: 3,
    },
    phases: [
      {
        title: "Aquecimento neural",
        exercises: [
          { name: "Bike erg progressiva", séries: 1, duration: "6 min", rest: 0 },
          { name: "Mobilidade torácica + prancha", séries: 2, duration: "40s", rest: 20 },
        ],
      },
      {
        title: "Força principal",
        exercises: [
          { name: "Back squat", séries: 5, reps: "5-6", load: "75-80% 1RM", rest: 120 },
          { name: "Supino inclinado com halteres", séries: 4, reps: 10, load: "RPE 8", rest: 75 },
        ],
      },
      {
        title: "Metcon final",
        exercises: [
          { name: "Kettlebell swing", séries: 3, reps: 15, rest: 30 },
          { name: "Sled push", séries: 3, distance: "25 m", rest: 60 },
        ],
      },
    ],
  },
  {
    id: "aero-cut",
    name: "Aero Cut 30",
    goal: "Emagrecimento",
    level: "Iniciante",
    focus: "HIIT + core",
    durationMinutes: 30,
    tempo: "6 semanas",
    days: ["Ter", "Qui", "Sáb"],
    summary: "Sessões curtas guiadas por intervalos inteligentes para queimar gordura e ganhar condicionamento.",
    thumbnail: "https://images.unsplash.com/photo-1579758629339-3e96d7d4c5d6?auto=format&fit=crop&w=800&q=80",
    heroVídeo: "https://storage.googleapis.com/fitness-assets/meu-shape/aero-cut-demo.mp4",
    coverImage: "https://images.unsplash.com/photo-1598970434795-0c54fe7c0642?auto=format&fit=crop&w=1600&q=80",
    equipment: ["Corda", "Mini band", "Peso corporal"],
    metrics: {
      weeklyVolumeKg: 2400,
      estimatedCalories: 350,
      sessionsPerWeek: 4,
    },
    phases: [
      {
        title: "Circuito 1: aceleração",
        exercises: [
          { name: "Polichinelo com banda", séries: 4, duration: "30s", rest: 15 },
          { name: "Mountain climber", séries: 4, duration: "30s", rest: 15 },
        ],
      },
      {
        title: "Circuito 2: core",
        exercises: [
          { name: "Prancha com toques no ombro", séries: 3, duration: "40s", rest: 20 },
          { name: "Dead bug controlado", séries: 3, reps: 12, rest: 20 },
        ],
      },
    ],
  },
  {
    id: "iron-shield",
    name: "Iron Shield",
    goal: "Hipertrofia",
    level: "Avançado",
    focus: "Upper / Lower",
    durationMinutes: 70,
    tempo: "8 semanas",
    days: ["Seg", "Ter", "Qui", "Sex"],
    summary: "Divisão upper/lower com ênfase em progressão linear de carga e controle de volume semanal.",
    thumbnail: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80",
    heroVídeo: "https://storage.googleapis.com/fitness-assets/meu-shape/iron-shield-demo.mp4",
    coverImage: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1600&q=80",
    equipment: ["Rack", "Barra", "Leg press", "Cabo"],
    metrics: {
      weeklyVolumeKg: 21000,
      estimatedCalories: 640,
      sessionsPerWeek: 4,
    },
    phases: [
      {
        title: "Lower A",
        exercises: [
          { name: "Agachamento frontal", séries: 4, reps: 6, load: "80% 1RM", rest: 150 },
          { name: "Levantamento romeno", séries: 4, reps: 8, rest: 120 },
        ],
      },
      {
        title: "Upper B",
        exercises: [
          { name: "Remada curvada", séries: 4, reps: 8, rest: 90 },
          { name: "Crucifixo inclinado", séries: 3, reps: 12, rest: 60 },
          { name: "Face pull", séries: 3, reps: 15, rest: 45 },
        ],
      },
    ],
  },
  {
    id: "mobility-flow",
    name: "Mobility Flow",
    goal: "Saúde geral",
    level: "Todos",
    focus: "Mobilidade + ativação",
    durationMinutes: 25,
    tempo: "Bloco contínuo",
    days: ["Diário"],
    summary: "Sequência guiada para destravar articulações, ativar core e melhorar postura entre treinos de força.",
    thumbnail: "https://images.unsplash.com/photo-1556817411-31ae72fa3ea0?auto=format&fit=crop&w=800&q=80",
    heroVídeo: "https://storage.googleapis.com/fitness-assets/meu-shape/mobility-flow-demo.mp4",
    coverImage: "https://images.unsplash.com/photo-1549576490-b0b4831ef60a?auto=format&fit=crop&w=1600&q=80",
    equipment: ["Mat", "Mini band"],
    metrics: {
      weeklyVolumeKg: 0,
      estimatedCalories: 180,
      sessionsPerWeek: 6,
    },
    phases: [
      {
        title: "Sequência flow",
        exercises: [
          { name: "90/90 dinâmico", séries: 3, duration: "50s", rest: 15 },
          { name: "Cat camel", séries: 3, reps: 12, rest: 10 },
          { name: "World greatest stretch", séries: 3, reps: 10, rest: 20 },
        ],
      },
    ],
  },
];

export const SAMPLE_MEAL_PLAN = {
  caloriesTarget: 2600,
  caloriesConsumed: 1850,
  protein: { current: 135, target: 180 },
  carbs: { current: 190, target: 280 },
  fats: { current: 55, target: 70 },
  hydration: 2.4,
  meals: [
    {
      id: "breakfast",
      title: "Café Turbo",
      time: "07:10",
      calories: 520,
      macros: { protein: 35, carbs: 60, fats: 15 },
      items: ["Omelete com espinafre", "Pão de fermentação natural", "Suco de laranjá"],
    },
    {
      id: "lunch",
      title: "Almoço Lean",
      time: "12:45",
      calories: 680,
      macros: { protein: 48, carbs: 70, fats: 22 },
      items: ["Frango grelhado", "Arroz integral", "Brócolis + azeite", "Purê de batata doce"],
    },
    {
      id: "snack",
      title: "Pós-treino express",
      time: "16:30",
      calories: 320,
      macros: { protein: 32, carbs: 42, fats: 6 },
      items: ["Shake whey + banana", "Mix de castanhas"],
    },
    {
      id: "dinner",
      title: "Jántar de recuperação",
      time: "20:15",
      calories: 410,
      macros: { protein: 20, carbs: 18, fats: 12 },
      items: ["Salmão assado", "Aspargos", "Salada verde"],
    },
  ],
  quickRecipes: [
    {
      id: "overnight-oats",
      name: "Overnight oats proteico",
      time: "10 min",
      macros: { protein: 28, carbs: 45, fats: 12 },
    },
    {
      id: "wrap-power",
      name: "Wrap power com frango desfiado",
      time: "12 min",
      macros: { protein: 32, carbs: 30, fats: 10 },
    },
    {
      id: "smoothie-green",
      name: "Smoothie verde antioxidante",
      time: "6 min",
      macros: { protein: 15, carbs: 25, fats: 5 },
    },
  ],
};

export const SAMPLE_PROGRESS = {
  weightHistory: [
    { week: "S1", value: 82.8 },
    { week: "S2", value: 82.3 },
    { week: "S3", value: 81.7 },
    { week: "S4", value: 81.2 },
    { week: "S5", value: 80.9 },
    { week: "S6", value: 80.4 },
    { week: "S7", value: 80.1 },
    { week: "S8", value: 79.8 },
    { week: "S9", value: 79.5 },
    { week: "S10", value: 79.2 },
  ],
  measures: [
    { label: "Peito", value: 105, delta: +1.5 },
    { label: "Braço", value: 39.2, delta: +0.8 },
    { label: "Cintura", value: 82, delta: -2.1 },
    { label: "Quadril", value: 100, delta: -0.8 },
  ],
  prs: [
    { id: "squat", name: "Back squat", value: "150 kg", delta: "+5 kg" },
    { id: "bench", name: "Supino reto", value: "105 kg", delta: "+2,5 kg" },
    { id: "deadlift", name: "Levantamento terra", value: "185 kg", delta: "+10 kg" },
  ],
  photos: [
    {
      id: "front-jun",
      angle: "Frente",
      date: "2025-06-04",
      url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=600&q=80",
      analysis: "Cintura visivelmente mais definida.",
    },
    {
      id: "side-jul",
      angle: "Lado",
      date: "2025-07-10",
      url: "https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?auto=format&fit=crop&w=600&q=80",
      analysis: "Postura torácica melhor alinhada.",
    },
  ],
};

export const SAMPLE_NOTIFICATIONS = [
  {
    id: "notif-1",
    title: "Treino concluído",
    message: "Você finalizou Shape Ignite em 54 min. Volume total +4% vs. semana passada.",
    type: "success",
    time: "há 2h",
  },
  {
    id: "notif-2",
    title: "Déficit calórico saudável",
    message: "Restam 620 kcal hoje. Sugestão: incluir 30 g de proteína no jántar.",
    type: "info",
    time: "há 5h",
  },
];

export const SAMPLE_COACH_PROMPTS = [
  "Monte um treino focado em quadríceps para quem só tem halteres.",
  "Sugira um cardápio com 160 g de proteína e 2.100 kcal.",
  "Recalcule minhas cargas considerando que aumentei 5 kg no agachamento.",
  "Crie um circuito de 15 minutos para hotel sem equipamentos.",
];

export const SAMPLE_TIMELINE = [
  { id: "hist-1", label: "Treino Shape Ignite", value: "Volume 14.8k kg", time: "hoje • 07:15" },
  { id: "hist-2", label: "PR atualizado", value: "Supino reto 105 kg", time: "ontem • 18:20" },
  { id: "hist-3", label: "Plano alimentar refeito", value: "2.550 kcal / 180 g proteína", time: "ontem • 08:45" },
  { id: "hist-4", label: "Check-in de peso", value: "80.9 kg", time: "2 dias atrás" },
];

