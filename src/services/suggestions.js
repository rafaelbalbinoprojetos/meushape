import { supabase } from "../lib/supabase.js";

function parseRepsText(text) {
  if (!text) return [];
  const matches = String(text).match(/\d+/g);
  if (!matches) return [];
  return matches.map((n) => Number.parseInt(n, 10)).filter(Number.isFinite);
}

function extractTargetRange(targetRepsText) {
  const reps = parseRepsText(targetRepsText);
  if (reps.length === 0) return { min: null, max: null };
  const min = Math.min(...reps);
  const max = Math.max(...reps);
  return { min, max };
}

function bestRepsFromHistory(entry) {
  if (!entry) return null;
  const reps = parseRepsText(entry.repeticoes_executadas);
  if (reps.length === 0) return null;
  return Math.max(...reps);
}

function roundLoad(value) {
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 2) / 2; // arredonda para 0.5
}

export async function getExerciseLoadSuggestions({ usuarioId, exercises = [] } = {}) {
  if (!usuarioId || exercises.length === 0) {
    return {};
  }

  const exerciseIds = exercises
    .map((exercise) => exercise.exercicioId)
    .filter(Boolean);

  if (exerciseIds.length === 0) return {};

  // Histórico de execuções + join com treino para filtrar pelo usuário
  const { data: execData, error: execError } = await supabase
    .from("execucoes")
    .select(
      `
        exercicio_id,
        carga_executada,
        repeticoes_executadas,
        series_executadas,
        criado_em,
        treino:treino_id (
          usuario_id
        )
      `,
    )
    .in("exercicio_id", exerciseIds)
    .eq("treino.usuario_id", usuarioId)
    .order("criado_em", { ascending: false });

  if (execError) {
    console.error("[getExerciseLoadSuggestions] erro execucoes:", execError);
  }

  const latestHistory = new Map();
  (execData ?? []).forEach((row) => {
    if (!row?.exercicio_id) return;
    if (!latestHistory.has(row.exercicio_id)) {
      latestHistory.set(row.exercicio_id, row);
    }
  });

  // Personal records como fallback
  const { data: prData, error: prError } = await supabase
    .from("personal_records")
    .select("exercicio_id, carga, repeticoes")
    .eq("usuario_id", usuarioId)
    .in("exercicio_id", exerciseIds);
  if (prError) {
    console.error("[getExerciseLoadSuggestions] erro prs:", prError);
  }
  const prMap = new Map((prData ?? []).map((pr) => [pr.exercicio_id, pr]));

  const suggestions = {};
  exercises.forEach((exercise) => {
    const target = extractTargetRange(exercise.targetReps);
    const last = latestHistory.get(exercise.exercicioId);
    const pr = prMap.get(exercise.exercicioId);

    let baseLoad = null;
    let basis = null;
    if (last?.carga_executada != null) {
      baseLoad = Number(last.carga_executada);
      basis = "history";
    } else if (pr?.carga != null) {
      baseLoad = Number(pr.carga) * 0.72; // ~72% do PR para hipertrofia
      basis = "pr";
    }

    if (!Number.isFinite(baseLoad)) {
      suggestions[exercise.exercicioId] = null;
      return;
    }

    const bestReps = bestRepsFromHistory(last);
    let suggested = baseLoad;

    if (basis === "history" && target.max && bestReps && bestReps >= target.max) {
      suggested = baseLoad * 1.025; // double progression leve
    } else if (basis === "history" && target.min && bestReps && bestReps < target.min) {
      suggested = baseLoad; // manter carga, foco em bater reps alvo
    }

    suggestions[exercise.exercicioId] = {
      suggestedLoad: roundLoad(suggested),
      basis,
      bestReps,
      target,
    };
  });

  return suggestions;
}
