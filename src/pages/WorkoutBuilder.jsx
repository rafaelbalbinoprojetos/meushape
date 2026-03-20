import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { SAMPLE_WORKOUTS } from "../data/fitness.js";
import { useExercises } from "../hooks/useExercises.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  createFichaWithExercises,
  getFichaById,
  listFichaTreinos,
  updateFichaWithExercises,
} from "../services/fichas.js";

const DEFAULT_EXERCISE_BLOCK = {
  exerciseId: "",
  series: "3",
  reps: "12",
  load: "",
  rest: "60",
  cues: "",
};

const SUBDIVISION_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const GOAL_OPTIONS = ["Hipertrofia", "Emagrecimento", "Saude geral"];
const LEVEL_OPTIONS = ["Iniciante", "Intermediario", "Avancado"];

function createExerciseBlock() {
  return { ...DEFAULT_EXERCISE_BLOCK };
}

function generateTreinoClientId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `treino-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getSubdivisionByIndex(index = 0) {
  if (!Number.isFinite(index) || index < 0) {
    return SUBDIVISION_ALPHABET[0];
  }
  return SUBDIVISION_ALPHABET[index % SUBDIVISION_ALPHABET.length];
}

function sanitizeSubdivisionValue(value, fallbackIndex = 0) {
  if (typeof value === "string") {
    const letter = value.replace(/[^a-z]/gi, "").toUpperCase().slice(0, 1);
    if (letter) {
      return letter;
    }
  }
  return getSubdivisionByIndex(fallbackIndex);
}

function createDefaultTreino(index = 0) {
  const subdivision = getSubdivisionByIndex(index);
  return {
    id: generateTreinoClientId(),
    nome: `Treino ${subdivision}`,
    descricao: "",
    subdivisao: subdivision,
    ordem: index + 1,
    exercises: [createExerciseBlock()],
  };
}

function mapExerciseFromRecord(exercise = {}) {
  const resolvedReps =
    exercise?.repeticoes != null
      ? String(exercise.repeticoes)
      : exercise?.reps != null
        ? String(exercise.reps)
        : "";
  return {
    exerciseId: exercise?.exercicio_id ? String(exercise.exercicio_id) : exercise?.exerciseId ?? "",
    series: exercise?.series != null ? String(exercise.series) : "",
    reps: resolvedReps,
    load:
      exercise?.carga != null
        ? String(exercise.carga)
        : typeof exercise?.load === "number"
          ? String(exercise.load)
          : exercise?.load ?? "",
    rest: exercise?.descanso_segundos != null ? String(exercise.descanso_segundos) : exercise?.rest ?? "",
    cues: exercise?.observacoes ?? exercise?.cues ?? "",
  };
}

function mapTreinosFromExisting(treinos = []) {
  if (!Array.isArray(treinos) || treinos.length === 0) {
    return [createDefaultTreino(0)];
  }
  return treinos.map((treino, index) => {
    const exercises = Array.isArray(treino?.ficha_exercicios)
      ? treino.ficha_exercicios.map((exercise) => mapExerciseFromRecord(exercise))
      : [createExerciseBlock()];
    return {
      id: treino?.id ?? generateTreinoClientId(),
      nome: treino?.nome ?? `Treino ${treino?.subdivisao ?? getSubdivisionByIndex(index)}`,
      descricao: treino?.descricao ?? "",
      subdivisao: treino?.subdivisao ?? getSubdivisionByIndex(index),
      ordem: Number.isFinite(treino?.ordem) ? treino.ordem : index + 1,
      exercises: exercises.length > 0 ? exercises : [createExerciseBlock()],
    };
  });
}

export default function WorkoutBuilderPage({ baseFichaId = null } = {}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: "Plano personalizado",
    goal: "Hipertrofia",
    level: "Intermediario",
    availableDays: ["Segunda", "Quarta", "Sexta"],
    equipment: ["Barra", "Halter"],
    duration: 55,
    description: "",
  });
  const [treinos, setTreinos] = useState(() => [createDefaultTreino(0)]);
  const [submitting, setSubmitting] = useState(false);
  const [editingFichaId, setEditingFichaId] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const isEditing = Boolean(editingFichaId);

  const exerciseFilters = useMemo(() => ({ limit: 200 }), []);
  const { items: availableExercises, loading: loadingExercises } = useExercises(exerciseFilters);
  const exerciseOptions = useMemo(() => {
    const unique = new Map();
    availableExercises.forEach((exercise) => {
      const id = exercise?.id ? String(exercise.id) : "";
      const name = (exercise?.nome ?? exercise?.name ?? "").trim();
      if (!id || !name || unique.has(id)) {
        return;
      }
      unique.set(id, { id, name });
    });
    return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
  }, [availableExercises]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleListChange = (field, value) => {
    const parsed = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    handleChange(field, parsed);
  };

  const handleTreinoFieldChange = (treinoId, field, value) => {
    if (isBusy) return;
    setTreinos((prev) =>
      prev.map((treino, index) => {
        if (treino.id !== treinoId) {
          return treino;
        }
        if (field === "subdivisao") {
          return { ...treino, subdivisao: sanitizeSubdivisionValue(value, index) };
        }
        return { ...treino, [field]: value };
      }),
    );
  };

  const addTreino = () => {
    if (isBusy) return;
    setTreinos((prev) => [...prev, createDefaultTreino(prev.length)]);
  };

  const removeTreino = (treinoId) => {
    if (isBusy) return;
    setTreinos((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      return prev.filter((treino) => treino.id !== treinoId);
    });
  };

  const fichaBaseId = useMemo(() => {
    if (baseFichaId) return baseFichaId;
    const value = searchParams.get("base");
    return value && value.trim() ? value.trim() : null;
  }, [baseFichaId, searchParams]);

  useEffect(() => {
    let active = true;
    async function loadExistingFicha(id) {
      setLoadingExisting(true);
      try {
      const fichaData = await getFichaById(id);
      if (!active) return;
      if (!fichaData) {
        throw new Error("Ficha nao encontrada.");
      }
      const treinosData = await listFichaTreinos(id);
      if (!active) return;
      setForm((prev) => ({
        ...prev,
        name: fichaData.nome ?? prev.name,
        goal: fichaData.objetivo ?? prev.goal,
        level: fichaData.nivel ?? prev.level,
        description: fichaData.descricao ?? "",
      }));
        setTreinos(mapTreinosFromExisting(treinosData));
        setEditingFichaId(id);
        toast.success("Ficha carregada para edicao.");
      } catch (error) {
        console.error("[WorkoutBuilder] erro ao carregar ficha existente:", error);
        if (active) {
          toast.error(error?.message ?? "Nao foi possivel carregar esta ficha para edicao.");
          setEditingFichaId(null);
        }
      } finally {
        if (active) {
          setLoadingExisting(false);
        }
      }
    }

    if (fichaBaseId) {
      loadExistingFicha(fichaBaseId);
    } else {
      setEditingFichaId(null);
    }

    return () => {
      active = false;
    };
  }, [fichaBaseId]);

  const handleTreinoExerciseChange = (treinoId, exerciseIndex, field, value) => {
    if (isBusy) return;
    setTreinos((prev) =>
      prev.map((treino) => {
        if (treino.id !== treinoId) {
          return treino;
        }
        const exercises = treino.exercises.map((exercise, index) =>
          index === exerciseIndex ? { ...exercise, [field]: value } : exercise,
        );
        return { ...treino, exercises };
      }),
    );
  };

  const addTreinoExercise = (treinoId) => {
    if (isBusy) return;
    setTreinos((prev) =>
      prev.map((treino) =>
        treino.id === treinoId ? { ...treino, exercises: [...treino.exercises, createExerciseBlock()] } : treino,
      ),
    );
  };

  const removeTreinoExercise = (treinoId, exerciseIndex) => {
    if (isBusy) return;
    setTreinos((prev) =>
      prev.map((treino) => {
        if (treino.id !== treinoId) {
          return treino;
        }
        if (treino.exercises.length <= 1) {
          return treino;
        }
        return { ...treino, exercises: treino.exercises.filter((_, index) => index !== exerciseIndex) };
      }),
    );
  };

  const nextSubdivisionLabel =
    SUBDIVISION_ALPHABET[treinos.length % SUBDIVISION_ALPHABET.length] ?? SUBDIVISION_ALPHABET[0];
  const isBusy = submitting || loadingExisting;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isBusy) return;

    const trimmedName = (form.name ?? "").trim();
    if (!trimmedName) {
      toast.error("Defina um nome para a ficha antes de salvar.");
      return;
    }

    if (!user?.id) {
      toast.error("Entre na plataforma para salvar a ficha na sua conta.");
      return;
    }

    const normalizeExerciseBlock = (block, index) => {
      const exerciseId = (block.exerciseId ?? "").trim();
      if (!exerciseId) {
        return null;
      }

      const seriesValue = Number.parseInt(block.series, 10);
      const restValue = Number.parseInt(block.rest, 10);
      const rawLoad = typeof block.load === "string" ? block.load.replace(",", ".").trim() : "";
      const parsedLoad = rawLoad ? Number.parseFloat(rawLoad) : null;

      const repsValue =
        typeof block.reps === "string"
          ? block.reps.trim()
          : block.reps != null
            ? String(block.reps).trim()
            : "";

      const notes = [];
      if (block.cues?.trim()) {
        notes.push(block.cues.trim());
      }
      if (!Number.isFinite(parsedLoad) && block.load?.trim()) {
        notes.push(`Carga: ${block.load.trim()}`);
      }

      return {
        exercicio_id: exerciseId,
        series: Number.isFinite(seriesValue) ? seriesValue : null,
        repeticoes: repsValue || null,
        carga: Number.isFinite(parsedLoad) ? parsedLoad : null,
        descanso_segundos: Number.isFinite(restValue) ? restValue : null,
        observacoes: notes.length > 0 ? notes.join(" | ") : null,
        ordem: index + 1,
      };
    };

    const normalizedTreinos = treinos
      .map((treino, treinoIndex) => {
        const normalizedExercises = treino.exercises
          .map((exercise, exerciseIndex) => normalizeExerciseBlock(exercise, exerciseIndex))
          .filter(Boolean);

        if (normalizedExercises.length === 0) {
          return null;
        }

        const subdivision = sanitizeSubdivisionValue(treino.subdivisao, treinoIndex);
        const nomeTreino = (treino.nome ?? "").trim();
        const descricaoTreino = (treino.descricao ?? "").trim();

        return {
          nome: nomeTreino || `Treino ${subdivision}`,
          descricao: descricaoTreino || null,
          subdivisao: subdivision,
          ordem: treinoIndex + 1,
          exercicios: normalizedExercises,
        };
      })
      .filter(Boolean);

    if (normalizedTreinos.length === 0) {
      toast.error("Adicione pelo menos um exercicio distribuido em algum treino.");
      return;
    }

    const subdivisionTracker = new Set();
    const hasDuplicateSubdivision = normalizedTreinos.some((treino) => {
      if (subdivisionTracker.has(treino.subdivisao)) {
        return true;
      }
      subdivisionTracker.add(treino.subdivisao);
      return false;
    });

    if (hasDuplicateSubdivision) {
      toast.error("Use letras unicas para identificar cada treino (A, B, C...).");
      return;
    }

    const descriptorParts = [
      form.goal && `Objetivo: ${form.goal}`,
      form.level && `Nivel: ${form.level}`,
      form.availableDays.length > 0 && `Dias: ${form.availableDays.join(", ")}`,
      form.equipment.length > 0 && `Equipamentos: ${form.equipment.join(", ")}`,
      form.duration && `Duracao media: ${form.duration} min`,
    ].filter(Boolean);
    const fichaDescription = form.description?.trim() || descriptorParts.join(" | ") || null;

    setSubmitting(true);
    try {
      if (isEditing) {
        await updateFichaWithExercises({
          fichaId: editingFichaId,
          ficha: {
            nome: trimmedName,
            descricao: fichaDescription,
            objetivo: form.goal,
            nivel: form.level,
          },
          treinos: normalizedTreinos,
        });
        toast.success("Ficha atualizada com sucesso!");
        navigate(`/fichas/${editingFichaId}`);
      } else {
        const { ficha } = await createFichaWithExercises({
          ficha: {
            usuario_id: user.id,
            nome: trimmedName,
            descricao: fichaDescription,
            objetivo: form.goal,
            nivel: form.level,
            visibilidade: "privada",
          },
          treinos: normalizedTreinos,
        });
        toast.success("Ficha salva com sucesso no Supabase!");
        setTreinos([createDefaultTreino(0)]);
        navigate(`/fichas/${ficha.id}`);
      }
    } catch (error) {
      console.error("[WorkoutBuilder] erro ao salvar ficha:", error);
      toast.error(error?.message ?? "Nao foi possivel salvar esta ficha no Supabase.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-10" onSubmit={handleSubmit}>
      <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#0b1120] to-[#132238] p-6 text-white shadow-2xl lg:p-10">
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">
          {isEditing ? "Editar ficha existente" : "Construir treino"}
        </p>
        <h1 className="mt-3 text-3xl font-semibold">
          {isEditing ? "Atualize sua ficha e mantenha tudo organizado." : "Monte uma ficha 100% alinhada ao seu objetivo."}
        </h1>
        <p className="mt-4 max-w-2xl text-white/70">
          {isEditing
            ? "Ajuste nome, descricao e toda a estrutura de treinos antes de salvar."
            : "Defina dias disponiveis, equipamentos e parametros de volume. Em breve voce podera sincronizar diretamente com o banco do MEU SHAPE."}
        </p>
        {loadingExisting && (
          <div className="mt-4 rounded-2xl border border-white/30 bg-white/10 p-4 text-sm text-white/80">
            Carregando ficha selecionada para edicao...
          </div>
        )}
        <div className="mt-6 grid gap-4 text-sm text-white/80 md:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Sugestão do coach</p>
            <p className="text-lg font-semibold">{SAMPLE_WORKOUTS[0].name}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Dias livres</p>
            <p className="text-lg font-semibold">{form.availableDays.join(", ")}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Equipamentos</p>
            <p className="text-lg font-semibold">{form.equipment.join(", ")}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/30 bg-white/80 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Descricao</p>
          <h2 className="text-2xl font-semibold text-[rgb(var(--text-primary))]">Detalhes complementares</h2>
        </header>
        <label className="space-y-2 text-sm">
          <span className="text-[rgb(var(--text-secondary))]">Descricao da ficha</span>
          <textarea
            rows="3"
            value={form.description}
            onChange={(event) => handleChange("description", event.target.value)}
            disabled={isBusy}
            className="w-full rounded-2xl border border-white/60 bg-white px-4 py-3 text-sm outline-none ring-2 ring-transparent transition focus:border-[#32C5FF] focus:ring-[#32C5FF]/30 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </label>
      </section>

      <section className="rounded-[32px] border border-white/30 bg-white/80 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Informações principais</p>
          <h2 className="text-2xl font-semibold text-[rgb(var(--text-primary))]">Dados do plano</h2>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="text-[rgb(var(--text-secondary))]">Nome do treino</span>
            <input
              value={form.name}
              onChange={(event) => handleChange("name", event.target.value)}
              disabled={isBusy}
              className="w-full rounded-2xl border border-white/60 bg-white px-4 py-3 text-sm outline-none ring-2 ring-transparent transition focus:border-[#32C5FF] focus:ring-[#32C5FF]/30 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[rgb(var(--text-secondary))]">Objetivo</span>
            <select
              value={form.goal}
              onChange={(event) => handleChange("goal", event.target.value)}
              disabled={isBusy}
              className="w-full rounded-2xl border border-white/60 bg-white px-4 py-3 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/30 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              {GOAL_OPTIONS.map((goalOption) => (
                <option key={goalOption} value={goalOption}>
                  {goalOption}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[rgb(var(--text-secondary))]">Nível</span>
            <select
              value={form.level}
              onChange={(event) => handleChange("level", event.target.value)}
              disabled={isBusy}
              className="w-full rounded-2xl border border-white/60 bg-white px-4 py-3 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/30 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              {LEVEL_OPTIONS.map((levelOption) => (
                <option key={levelOption} value={levelOption}>
                  {levelOption}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[rgb(var(--text-secondary))]">Equipamentos disponíveis</span>
            <input
              value={form.equipment.join(", ")}
              onChange={(event) => handleListChange("equipment", event.target.value)}
              placeholder="Separe por vírgula"
              className="w-full rounded-2xl border border-white/60 bg-white px-4 py-3 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[rgb(var(--text-secondary))]">Dias disponíveis</span>
            <input
              value={form.availableDays.join(", ")}
              onChange={(event) => handleListChange("availableDays", event.target.value)}
              placeholder="Ex.: Segunda, Quarta..."
              className="w-full rounded-2xl border border-white/60 bg-white px-4 py-3 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[rgb(var(--text-secondary))]">Duração média (min)</span>
            <input
              type="number"
              min="10"
              value={form.duration}
              onChange={(event) => handleChange("duration", Number(event.target.value))}
              className="w-full rounded-2xl border border-white/60 bg-white px-4 py-3 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>
        </div>
      </section>

      <section className="space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Treinos e subdivisoes</p>
          <h2 className="text-2xl font-semibold text-[rgb(var(--text-primary))]">Organize os dias do plano</h2>
          <p className="text-sm text-[rgb(var(--text-secondary))]">
            Separe os exercicios em Treino A, B, C... para refletir as subdivisoes cadastradas no Supabase.
          </p>
        </header>

        {treinos.map((treino, treinoIndex) => (
          <div
            key={treino.id}
            className="rounded-[32px] border border-white/30 bg-white/80 p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900/70"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[rgb(var(--text-secondary))]">
                  Treino {treino.subdivisao}
                </p>
                <h3 className="text-xl font-semibold text-[rgb(var(--text-primary))]">
                  {treino.nome?.trim() || `Treino ${treino.subdivisao}`}
                </h3>
                {treino.descricao ? (
                  <p className="text-sm text-[rgb(var(--text-secondary))]">{treino.descricao}</p>
                ) : (
                  <p className="text-sm text-[rgb(var(--text-secondary))]">
                    Defina foco, musculos ou instrucoes especificas para este bloco.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => addTreinoExercise(treino.id)}
                  className="rounded-2xl border border-dashed border-[#32C5FF]/60 px-4 py-2 text-xs font-semibold text-[#32C5FF]"
                >
                  + Exercicios
                </button>
                {treinos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTreino(treino.id)}
                    className="rounded-2xl border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-500"
                  >
                    Remover treino
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <label className="space-y-1 text-xs">
                <span>Subdivisao (letra)</span>
                <input
                  value={treino.subdivisao}
                  maxLength={1}
                  onChange={(event) => handleTreinoFieldChange(treino.id, "subdivisao", event.target.value)}
                  className="w-full rounded-2xl border border-white/60 bg-white px-3 py-2 text-sm uppercase outline-none focus:border-[#32C5FF] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </label>
              <label className="space-y-1 text-xs">
                <span>Nome do treino</span>
                <input
                  value={treino.nome}
                  onChange={(event) => handleTreinoFieldChange(treino.id, "nome", event.target.value)}
                  placeholder={`Treino ${treino.subdivisao}`}
                  className="w-full rounded-2xl border border-white/60 bg-white px-3 py-2 text-sm outline-none focus:border-[#32C5FF] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </label>
              <label className="space-y-1 text-xs lg:col-span-2">
                <span>Descricao / observacoes</span>
                <input
                  value={treino.descricao}
                  onChange={(event) => handleTreinoFieldChange(treino.id, "descricao", event.target.value)}
                  placeholder="Ex.: Peito e triceps pesado"
                  className="w-full rounded-2xl border border-white/60 bg-white px-3 py-2 text-sm outline-none focus:border-[#32C5FF] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </label>
            </div>

            <div className="mt-6 space-y-4">
              {treino.exercises.map((exercise, exerciseIndex) => (
                <div
                  key={`${treino.id}-exercise-${exerciseIndex}`}
                  className="rounded-3xl border border-white/50 bg-white p-5 shadow-md dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[rgb(var(--text-secondary))]">
                      Exercicio #{exerciseIndex + 1}
                    </p>
                    {treino.exercises.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTreinoExercise(treino.id, exerciseIndex)}
                        className="text-xs font-semibold text-rose-500"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                  <div className="mt-4 grid gap-3 lg:grid-cols-4">
                    <label className="space-y-1 text-xs">
                      <span>Exercicio</span>
                      <select
                        value={exercise.exerciseId}
                        onChange={(event) =>
                          handleTreinoExerciseChange(treino.id, exerciseIndex, "exerciseId", event.target.value)
                        }
                        className="w-full rounded-2xl border border-white/60 bg-white px-3 py-2 text-sm outline-none focus:border-[#32C5FF] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="">
                          {loadingExercises ? "Carregando exercicios..." : "Selecione um exercicio"}
                        </option>
                        {exerciseOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1 text-xs">
                      <span>Series</span>
                      <input
                        type="number"
                        value={exercise.series}
                        onChange={(event) =>
                          handleTreinoExerciseChange(treino.id, exerciseIndex, "series", event.target.value)
                        }
                        className="w-full rounded-2xl border border-white/60 bg-white px-3 py-2 text-sm outline-none focus:border-[#32C5FF] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </label>
                    <label className="space-y-1 text-xs">
                      <span>Repeticoes / tempo</span>
                      <input
                        value={exercise.reps}
                        onChange={(event) =>
                          handleTreinoExerciseChange(treino.id, exerciseIndex, "reps", event.target.value)
                        }
                        className="w-full rounded-2xl border border-white/60 bg-white px-3 py-2 text-sm outline-none focus:border-[#32C5FF] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </label>
                    <label className="space-y-1 text-xs">
                      <span>Carga sugerida</span>
                      <input
                        value={exercise.load}
                        onChange={(event) =>
                          handleTreinoExerciseChange(treino.id, exerciseIndex, "load", event.target.value)
                        }
                        placeholder="Ex.: 70 kg / RPE 8"
                        className="w-full rounded-2xl border border-white/60 bg-white px-3 py-2 text-sm outline-none focus:border-[#32C5FF] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </label>
                    <label className="space-y-1 text-xs">
                      <span>Descanso (seg)</span>
                      <input
                        type="number"
                        value={exercise.rest}
                        onChange={(event) =>
                          handleTreinoExerciseChange(treino.id, exerciseIndex, "rest", event.target.value)
                        }
                        className="w-full rounded-2xl border border-white/60 bg-white px-3 py-2 text-sm outline-none focus:border-[#32C5FF] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </label>
                    <label className="space-y-1 text-xs lg:col-span-3">
                      <span>Observacoes</span>
                      <input
                        value={exercise.cues}
                        onChange={(event) =>
                          handleTreinoExerciseChange(treino.id, exerciseIndex, "cues", event.target.value)
                        }
                        placeholder="Cadencia, amplitude, seguranca..."
                        className="w-full rounded-2xl border border-white/60 bg-white px-3 py-2 text-sm outline-none focus:border-[#32C5FF] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </label>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addTreinoExercise(treino.id)}
                className="w-full rounded-2xl border border-dashed border-[#32C5FF]/50 py-3 text-sm font-semibold text-[#32C5FF]"
              >
                + Adicionar exercicio no Treino {treino.subdivisao}
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addTreino}
          className="w-full rounded-2xl border border-dashed border-white/60 py-3 text-sm font-semibold text-[rgb(var(--text-primary))] dark:border-slate-700"
        >
          + Adicionar Treino {nextSubdivisionLabel}
        </button>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isBusy}
          className="inline-flex flex-1 items-center justify-center rounded-3xl bg-[#0f1f3c] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/40 disabled:opacity-60"
        >
          {isEditing ? "Salvar alteracoes" : "Salvar treino no MEU SHAPE"}
        </button>
        <button
          type="button"
          onClick={() => toast("Funcao em breve: sincronizar com Supabase.")}
          className="inline-flex flex-1 items-center justify-center rounded-3xl border border-[#0f1f3c] px-5 py-3 text-sm font-semibold text-[#0f1f3c] dark:border-white/40 dark:text-white"
        >
          Exportar para CSV
        </button>
      </div>
    </form>
  );
}


