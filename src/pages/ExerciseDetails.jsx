import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getExerciseById, updateExercise } from "../services/exercises.js";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import { Play, Upload } from "lucide-react";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1558611848-73f7eb4001a1?auto=format&fit=crop&w=1600&q=80";

const LEVEL_BADGES = {
  iniciante: { label: "Iniciante", tone: "bg-emerald-500/10 border border-emerald-400/40 text-emerald-200" },
  intermediario: { label: "Intermediario", tone: "bg-sky-500/10 border border-sky-400/40 text-sky-200" },
  avancado: { label: "Avancado", tone: "bg-orange-500/10 border border-orange-400/40 text-orange-200" },
  pro: { label: "Pro", tone: "bg-fuchsia-500/10 border border-fuchsia-400/40 text-fuchsia-200" },
};

const RISK_BADGES = {
  baixo: { label: "Baixo impacto", tone: "bg-emerald-500/10 border border-emerald-400/40 text-emerald-200" },
  moderado: { label: "Moderado", tone: "bg-amber-500/10 border border-amber-400/40 text-amber-200" },
  alto: { label: "Alto risco", tone: "bg-rose-500/10 border border-rose-400/40 text-rose-200" },
};

function parseExecutionSteps(execucao) {
  if (!execucao) return [];
  return execucao
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeGroup(group) {
  if (!group) return "Grupo livre";
  return group.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function formatDate(value) {
  if (!value) return "Sem registro";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

const VIDEO_BUCKET = import.meta.env.VITE_SUPABASE_VIDEO_BUCKET || "midias";

export default function ExerciseDetailsPage() {
  const { exerciseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, exercise: null });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    descricao: "",
    grupo: "",
    equipamento: "",
    video_url: "",
    imagem_url: "",
    execucao: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadExercise() {
      setState({ loading: true, error: null, exercise: null });
      try {
        const data = await getExerciseById(exerciseId);
        if (!active) return;
        if (!data) {
          setState({ loading: false, error: "Exercicio nao encontrado.", exercise: null });
          return;
        }
        setState({ loading: false, error: null, exercise: data });
        setForm({
          nome: data.nome ?? "",
          descricao: data.descricao ?? "",
          grupo: data.grupo ?? "",
          equipamento: data.equipamento ?? "",
          video_url: data.video_url ?? "",
          imagem_url: data.imagem_url ?? "",
          execucao: data.execucao ?? "",
        });
      } catch (err) {
        if (!active) return;
        setState({
          loading: false,
          error: err?.message ?? "Nao foi possivel carregar os detalhes deste exercicio.",
          exercise: null,
        });
      }
    }
    loadExercise();
    return () => {
      active = false;
    };
  }, [exerciseId]);

  const { loading, error, exercise } = state;
  const canEdit = Boolean(user?.email && user.email.toLowerCase() === "balbino10@hotmail.com");
  const steps = useMemo(() => parseExecutionSteps(exercise?.execucao ?? ""), [exercise]);
  const levelTag = exercise?.nivel ? LEVEL_BADGES[exercise.nivel.toLowerCase()] : null;
  const riskTag = exercise?.risco ? RISK_BADGES[exercise.risco.toLowerCase()] : null;

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!exercise?.id || !canEdit || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateExercise(exercise.id, form);
      setState((prev) => ({ ...prev, exercise: updated ?? prev.exercise }));
      setEditing(false);
    } catch (saveErr) {
      console.error("[ExerciseDetails] erro ao salvar exercicio:", saveErr);
      setSaveError(saveErr?.message ?? "Nao foi possivel salvar as alteracoes.");
    } finally {
      setSaving(false);
    }
  };

  const handleVideoUpload = async (file) => {
    if (!file || !canEdit) return;
    setUploading(true);
    setSaveError(null);
    try {
      const path = `exercicios/${exercise.id}/video-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from(VIDEO_BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });
      if (uploadError) throw uploadError;
      const { data: publicData, error: publicError } = supabase.storage.from(VIDEO_BUCKET).getPublicUrl(path);
      if (publicError) throw publicError;
      if (publicData?.publicUrl) {
        handleFieldChange("video_url", publicData.publicUrl);
      }
    } catch (uploadErr) {
      console.error("[ExerciseDetails] erro ao subir video:", uploadErr);
      setSaveError(uploadErr?.message ?? "Nao foi possivel enviar o video.");
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = async (file) => {
    if (!file || !canEdit) return;
    setUploadingImage(true);
    setSaveError(null);
    try {
      const path = `exercicios/${exercise.id}/thumb-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from(VIDEO_BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });
      if (uploadError) throw uploadError;
      const { data: publicData, error: publicError } = supabase.storage.from(VIDEO_BUCKET).getPublicUrl(path);
      if (publicError) throw publicError;
      if (publicData?.publicUrl) {
        handleFieldChange("imagem_url", publicData.publicUrl);
      }
    } catch (uploadErr) {
      console.error("[ExerciseDetails] erro ao subir imagem:", uploadErr);
      setSaveError(uploadErr?.message ?? "Nao foi possivel enviar a imagem.");
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="space-y-10">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-[rgb(var(--text-secondary))]"
      >
        Voltar
      </button>

      {loading && (
        <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#050914] via-[#0f1f3c] to-[#0f172a] p-10 text-white shadow-2xl">
          <p className="text-sm font-semibold text-white/70">Carregando dados do exercicio...</p>
        </section>
      )}

      {!loading && error && (
        <section className="rounded-[32px] border border-[#FF8F8F]/30 bg-[#2B0C0C] p-8 text-white">
          <h1 className="text-2xl font-semibold">Algo deu errado</h1>
          <p className="mt-2 text-sm text-white/80">{error}</p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => navigate("/exercicios")}
              className="rounded-2xl border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/60"
            >
              Voltar para exercicios
            </button>
          </div>
        </section>
      )}

      {exercise && (
        <>
          <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#050914] via-[#0b1f3a] to-[#041229] p-6 text-white shadow-2xl lg:p-10">
            <div className="grid gap-10 lg:grid-cols-[1.6fr,1fr]">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/60">Exercicio oficial</p>
                <h1 className="mt-3 text-4xl font-semibold leading-tight">{exercise.nome}</h1>
                <p className="mt-4 text-lg text-white/80">
                  {exercise.descricao ?? "Sem descricao detalhada ainda."}
                </p>

                <dl className="mt-6 grid gap-4 text-sm text-white/80 sm:grid-cols-2">
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <dt className="text-xs uppercase tracking-[0.35em] text-white/50">Grupo muscular</dt>
                    <dd className="mt-2 text-lg font-semibold text-white">{normalizeGroup(exercise.grupo)}</dd>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <dt className="text-xs uppercase tracking-[0.35em] text-white/50">Equipamento</dt>
                    <dd className="mt-2 text-lg font-semibold text-white">
                      {exercise.equipamento ?? "Livre / custom"}
                    </dd>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <dt className="text-xs uppercase tracking-[0.35em] text-white/50">Criado em</dt>
                    <dd className="mt-2 text-lg font-semibold text-white">{formatDate(exercise.criado_em)}</dd>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <dt className="text-xs uppercase tracking-[0.35em] text-white/50">Atualizado em</dt>
                    <dd className="mt-2 text-lg font-semibold text-white">{formatDate(exercise.atualizado_em)}</dd>
                  </div>
                </dl>

                <div className="mt-6 flex flex-wrap gap-3 text-xs">
                  {levelTag ? (
                    <span className={`rounded-full px-4 py-1 font-semibold uppercase tracking-[0.35em] ${levelTag.tone}`}>
                      {levelTag.label}
                    </span>
                  ) : null}
                  {riskTag ? (
                    <span className={`rounded-full px-4 py-1 font-semibold uppercase tracking-[0.35em] ${riskTag.tone}`}>
                      {riskTag.label}
                    </span>
                  ) : null}
                  {exercise.tipo_execucao ? (
                    <span className="rounded-full border border-white/20 px-4 py-1 font-semibold uppercase tracking-[0.35em] text-white/80">
                      {exercise.tipo_execucao.replace(/_/g, " ")}
                    </span>
                  ) : null}
                </div>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to={`/treinos/novo?exercicios=${exercise.id}`}
                  className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#32C5FF] to-[#67FF9A] px-6 py-3 text-sm font-semibold text-[#050914] shadow-lg shadow-[#32C5FF]/30"
                >
                  Usar no construtor
                </Link>
                <button
                  type="button"
                  onClick={() => navigate("/exercicios")}
                  className="inline-flex items-center gap-3 rounded-2xl border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/40"
                >
                  Voltar para catalogo
                </button>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => setEditing((prev) => !prev)}
                    className="inline-flex items-center gap-3 rounded-2xl border border-amber-300/60 px-6 py-3 text-sm font-semibold text-amber-100 transition hover:border-amber-200/80"
                  >
                    {editing ? "Cancelar edição" : "Editar exercicio"}
                  </button>
                ) : null}
              </div>
            </div>

              <div className="rounded-[32px] border border-white/10 bg-white/5 p-4 backdrop-blur-2xl">
                <div className="relative h-72 overflow-hidden rounded-[28px] border border-white/10">
                  <img
                    src={exercise.imagem_url || DEFAULT_IMAGE}
                    alt={exercise.nome}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  {exercise.video_url ? (
                    <button
                      type="button"
                      onClick={() => setShowVideo(true)}
                      className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-black/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white transition hover:bg-black/80"
                    >
                      <Play className="h-4 w-4" />
                      Assistir vídeo
                    </button>
                  ) : (
                    <span className="absolute left-4 top-4 rounded-full bg-black/40 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white/80">
                      Sem video
                    </span>
                  )}
                </div>
                <div className="mt-4 space-y-2 text-white">
                  <p className="text-xs uppercase tracking-[0.35em] text-white/60">Ficha tecnica</p>
                  <p className="text-2xl font-semibold">{exercise.nome}</p>
                  <p className="text-sm text-white/70">
                    {exercise.descricao ?? "Cadastre observacoes no Supabase para enriquecer este bloco."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
            <div className="rounded-[32px] border border-white/10 bg-white/70 p-6 shadow-xl dark:bg-slate-900/70">
              <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-secondary))]">Execucao guiada</p>
              {steps.length === 0 ? (
                <p className="mt-4 text-sm text-[rgb(var(--text-secondary))]">
                  Nenhuma instrução cadastrada ainda. Preencha o campo <code>execucao</code> no Supabase para orientar o aluno.
                </p>
              ) : (
                <ol className="mt-4 space-y-3">
                  {steps.map((step, index) => (
                    <li key={`step-${index}`} className="rounded-2xl border border-white/40 bg-white/40 p-4 text-[rgb(var(--text-primary))] dark:border-white/5 dark:bg-white/5">
                      <span className="text-xs font-semibold uppercase tracking-[0.35em] text-[rgb(var(--text-secondary))]">
                        Passo {index + 1}
                      </span>
                      <p className="mt-2 text-base">{step}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="space-y-6">
              <div className="rounded-[32px] border border-white/10 bg-white/70 p-6 shadow-xl dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-secondary))]">Metadados</p>
                {canEdit && (
                  <form className="mt-4 space-y-4 rounded-2xl border border-amber-200/60 bg-amber-50/60 p-4 text-sm text-[rgb(var(--text-secondary))] dark:border-amber-200/30 dark:bg-amber-200/5" onSubmit={handleSave}>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700 dark:text-amber-200">
                      Edição (somente balbino10@hotmail.com)
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="space-y-1">
                        <span className="text-[rgb(var(--text-secondary))]">Nome</span>
                        <input
                          value={form.nome}
                          onChange={(e) => handleFieldChange("nome", e.target.value)}
                          className="w-full rounded-xl border border-white/40 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[rgb(var(--text-secondary))]">Grupo muscular</span>
                        <input
                          value={form.grupo}
                          onChange={(e) => handleFieldChange("grupo", e.target.value)}
                          className="w-full rounded-xl border border-white/40 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[rgb(var(--text-secondary))]">Equipamento</span>
                        <input
                          value={form.equipamento}
                          onChange={(e) => handleFieldChange("equipamento", e.target.value)}
                          className="w-full rounded-xl border border-white/40 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[rgb(var(--text-secondary))]">Video (URL)</span>
                        <input
                          value={form.video_url}
                          onChange={(e) => handleFieldChange("video_url", e.target.value)}
                          className="w-full rounded-xl border border-white/40 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[rgb(var(--text-secondary))]">Imagem (URL)</span>
                        <input
                          value={form.imagem_url}
                          onChange={(e) => handleFieldChange("imagem_url", e.target.value)}
                          className="w-full rounded-xl border border-white/40 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </label>
                    </div>
                    <label className="space-y-1">
                      <span className="text-[rgb(var(--text-secondary))]">Descricao</span>
                      <textarea
                        rows="3"
                        value={form.descricao}
                        onChange={(e) => handleFieldChange("descricao", e.target.value)}
                        className="w-full rounded-xl border border-white/40 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[rgb(var(--text-secondary))]">Execucao (passo a passo, 1 por linha)</span>
                      <textarea
                        rows="4"
                        value={form.execucao}
                        onChange={(e) => handleFieldChange("execucao", e.target.value)}
                        className="w-full rounded-xl border border-white/40 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white px-3 py-2 text-xs font-semibold text-[rgb(var(--text-secondary))] dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                        <input
                          type="file"
                          accept="video/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleVideoUpload(file);
                          }}
                          className="text-xs"
                          disabled={uploading}
                        />
                        {uploading ? "Enviando..." : (
                          <>
                            <Upload className="h-3.5 w-3.5" />
                            Upload video
                          </>
                        )}
                      </label>
                      <label className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white px-3 py-2 text-xs font-semibold text-[rgb(var(--text-secondary))] dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file);
                          }}
                          className="text-xs"
                          disabled={uploadingImage}
                        />
                        {uploadingImage ? "Enviando..." : (
                          <>
                            <Upload className="h-3.5 w-3.5" />
                            Upload imagem
                          </>
                        )}
                      </label>
                      <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#0f1f3c] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-slate-900/30 disabled:opacity-60"
                      >
                        {saving ? "Salvando..." : "Salvar exercicio"}
                      </button>
                      {saveError ? <span className="text-xs text-rose-500">{saveError}</span> : null}
                    </div>
                  </form>
                )}
                <dl className="mt-4 space-y-3 text-sm text-[rgb(var(--text-secondary))]">
                  <div className="rounded-2xl border border-white/30 bg-white/40 p-4 dark:border-white/10 dark:bg-white/5">
                    <dt className="text-xs uppercase tracking-[0.35em]">ID publico</dt>
                    <dd className="mt-2 break-all text-[rgb(var(--text-primary))]">{exercise.id}</dd>
                  </div>
                  <div className="rounded-2xl border border-white/30 bg-white/40 p-4 dark:border-white/10 dark:bg-white/5">
                    <dt className="text-xs uppercase tracking-[0.35em]">Video</dt>
                    <dd className="mt-2 text-[rgb(var(--text-primary))]">
                      {exercise.video_url ? (
                        <a
                          href={exercise.video_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#32C5FF] underline-offset-4 hover:underline"
                        >
                          {exercise.video_url}
                        </a>
                      ) : (
                        "Sem URL cadastrada"
                      )}
                    </dd>
                  </div>
                  <div className="rounded-2xl border border-white/30 bg-white/40 p-4 dark:border-white/10 dark:bg-white/5">
                    <dt className="text-xs uppercase tracking-[0.35em]">Imagem</dt>
                    <dd className="mt-2 text-[rgb(var(--text-primary))]">
                      {exercise.imagem_url ? (
                        <a
                          href={exercise.imagem_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#67FF9A] underline-offset-4 hover:underline"
                        >
                          {exercise.imagem_url}
                        </a>
                      ) : (
                        "Usando imagem padrao"
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>
        </>
      )}

      {showVideo && exercise?.video_url ? (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 px-4 py-6">
          <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950/90 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">Execução em vídeo</p>
                <p className="text-sm font-semibold text-white">{exercise.nome}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={exercise.video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white/80 transition hover:border-white/60"
                >
                  Abrir em nova aba
                </a>
                <button
                  type="button"
                  onClick={() => setShowVideo(false)}
                  className="rounded-full border border-white/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white/80 transition hover:border-white/60"
                >
                  Fechar
                </button>
              </div>
            </div>
            <div className="grid gap-4 p-4 lg:grid-cols-[2fr,1fr]">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
                <video
                  key={exercise.video_url}
                  src={exercise.video_url}
                  controls
                  controlsList="nodownload"
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full"
                  poster={exercise.imagem_url || DEFAULT_IMAGE}
                />
              </div>
              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-white">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Passo a passo</p>
                {steps.length === 0 ? (
                  <p className="text-sm text-white/70">Nenhuma instrução cadastrada ainda.</p>
                ) : (
                  <ol className="space-y-2 text-sm text-white/80">
                    {steps.map((step, index) => (
                      <li key={`modal-step-${index}`} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">Passo {index + 1}</span>
                        <p className="mt-1">{step}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
