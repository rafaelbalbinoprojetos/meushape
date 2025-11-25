import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { listExercises } from "../services/exercises.js";

const FALLBACK_EXERCISES = [
  {
    id: "pushup",
    nome: "Flexao de bracos",
    grupo: "Peito",
    descricao: "Manter o core ativo e controlar a descida em 2 segundos.",
    equipamento: "Peso corporal",
    video_url: null,
    imagem_url: "https://images.unsplash.com/photo-1517964603305-11c0f6f66012?auto=format&fit=crop&w=600&q=80",
    tipo_execucao: "peso_corporal",
    nivel: "iniciante",
    risco: "baixo",
    execucao: "Mantenha as maos alinhadas com o peito.\nDesça em 2 segundos e suba em 1 segundo.",
  },
  {
    id: "barbell-squat",
    nome: "Agachamento livre",
    grupo: "Pernas",
    descricao: "Abaixar ate a paralela mantendo peito aberto.",
    equipamento: "Barra / rack",
    video_url: "https://videos.meushape/squat-demo.mp4",
    imagem_url: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=600&q=80",
    tipo_execucao: "livre",
    nivel: "intermediario",
    risco: "moderado",
    execucao: "Pise firme e mantenha o core ativo.\nDesça com controle ate a paralela antes de subir.",
  },
  {
    id: "lat-pulldown",
    nome: "Puxada na frente",
    grupo: "Costas",
    descricao: "Pensar em trazer o cotovelo para os flancos.",
    equipamento: "Pulley alto",
    video_url: "https://videos.meushape/lat-demo.mp4",
    imagem_url: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=600&q=80",
    tipo_execucao: "maquina",
    nivel: "iniciante",
    risco: "baixo",
    execucao: "Segure a barra com pegada aberta.\nConduza ate o queixo encaixando escapulas.",
  },
  {
    id: "hip-thrust",
    nome: "Hip thrust",
    grupo: "Posterior",
    descricao: "Manter queixo recolhido e segurar 1s no topo.",
    equipamento: "Barra / banco",
    video_url: null,
    imagem_url: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=80",
    tipo_execucao: "livre",
    nivel: "avancado",
    risco: "moderado",
    execucao: "Apoie as escapulas no banco e mantenha os pes firmes.\nSuba ate alinhar tronco e coxas segurando 1 segundo.",
  },
];

export function useExercises(filters = {}) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchExercises = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { items: data, count } = await listExercises(filters);
      setItems(data);
      setTotal(typeof count === "number" ? count : data.length);
    } catch (err) {
      console.error("[useExercises] erro ao carregar exercicios:", err);
      const message = err?.message ?? "Nao foi possivel carregar os exercicios.";
      setError(message);
      toast.error(message);

      const normalizedSearch = (filters.search ?? "").trim().toLowerCase();
      const fallbackFiltered = FALLBACK_EXERCISES.filter((exercise) => {
        if (normalizedSearch) {
          const match =
            exercise.nome.toLowerCase().includes(normalizedSearch) ||
            (exercise.descricao ?? "").toLowerCase().includes(normalizedSearch);
          if (!match) return false;
        }
        if (filters.group && exercise.grupo !== filters.group) {
          return false;
        }
        if (filters.equipment && !(exercise.equipamento ?? "").toLowerCase().includes(filters.equipment.toLowerCase())) {
          return false;
        }
        if (typeof filters.hasVideo === "boolean") {
          const hasVideo = Boolean(exercise.video_url);
          if (hasVideo !== filters.hasVideo) return false;
        }
        if (filters.nivel && (exercise.nivel ?? "").toLowerCase() !== filters.nivel.toLowerCase()) {
          return false;
        }
        if (filters.risco && (exercise.risco ?? "").toLowerCase() !== filters.risco.toLowerCase()) {
          return false;
        }
        if (filters.tipoExecucao && (exercise.tipo_execucao ?? "").toLowerCase() !== filters.tipoExecucao.toLowerCase()) {
          return false;
        }
        return true;
      });

      setItems(fallbackFiltered);
      setTotal(fallbackFiltered.length);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  return {
    items,
    total,
    loading,
    error,
    reload: fetchExercises,
  };
}
