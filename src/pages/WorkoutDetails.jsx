import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import WorkoutLink from "../components/WorkoutLink.jsx";
import { SAMPLE_WORKOUTS } from "../data/fitness.js";

export default function WorkoutDetailsPage() {
  const { workoutId } = useParams();
  const navigate = useNavigate();
  const workout = useMemo(
    () => SAMPLE_WORKOUTS.find((item) => item.id === workoutId) ?? SAMPLE_WORKOUTS[0],
    [workoutId],
  );

  return (
    <div className="space-y-10">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[rgb(var(--text-secondary))]"
      >
        ← Voltar
      </button>

      <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#050914] via-[#0f1f3c] to-[#0f172a] p-6 text-white shadow-2xl lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.4fr,1fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">{workout.goal}</p>
            <h1 className="mt-2 text-4xl font-semibold leading-tight">{workout.name}</h1>
            <p className="mt-3 text-white/70">
              {workout.focus} • {workout.level} • {workout.durationMinutes} min • {workout.days.join(" / ")}
            </p>
            <p className="mt-6 text-lg text-white/80">{workout.summary}</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <Metric label="Volume semanal" value={`${workout.metrics.weeklyVolumeKg.toLocaleString()} kg`} />
              <Metric label="Calorias estimadas" value={`${workout.metrics.estimatedCalories} kcal`} />
              <Metric label="Sessões por semana" value={`${workout.metrics.sessionsPerWeek}x`} />
            </div>

            <div className="mt-8 flex flex-wrap gap-3 text-sm text-white/80">
              {workout.equipment.map((item) => (
                <span key={item} className="rounded-full border border-white/30 px-4 py-2">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/20 bg-white/10 p-4 shadow-xl backdrop-blur-xl">
            <video
              src={workout.heroVideo}
              poster={workout.coverImage}
              controls
              className="h-64 w-full rounded-3xl border border-white/10 object-cover"
            >
              Seu navegador não suporta vídeos embutidos.
            </video>
            <p className="mt-3 text-sm text-white/70">
              Vídeo demonstrativo com instruções de execução, tempo de descanso e checkpoints de postura.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button className="flex-1 rounded-2xl bg-white/90 px-4 py-2 text-sm font-semibold text-[#050914]">
                Baixar ficha em PDF
              </button>
              <button className="flex-1 rounded-2xl border border-white/40 px-4 py-2 text-sm font-semibold text-white">
                Enviar para a agenda
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/30 bg-white/80 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
        <header>
          <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Estrutura</p>
          <h2 className="text-2xl font-semibold text-[rgb(var(--text-primary))]">Fases do treino</h2>
          <p className="text-sm text-[rgb(var(--text-secondary))]">
            Registre suas execuções diretamente no app para liberar ajustes automáticos de carga e tempo.
          </p>
        </header>
        <div className="mt-6 space-y-6">
          {workout.phases.map((phase) => (
            <article
              key={phase.title}
              className="rounded-3xl border border-white/40 bg-white/70 p-4 shadow-inner dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div className="flex flex-wrap items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Fase</p>
                  <h3 className="text-xl font-semibold text-[rgb(var(--text-primary))]">{phase.title}</h3>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto rounded-2xl border border-white/50">
                <table className="min-w-full text-sm">
                  <thead className="bg-white/70 text-left text-xs uppercase tracking-[0.2em] text-[rgb(var(--text-secondary))] dark:bg-slate-900/40">
                    <tr>
                      <th className="px-4 py-3">Exercício</th>
                      <th className="px-4 py-3">Séries</th>
                      <th className="px-4 py-3">Reps / Tempo</th>
                      <th className="px-4 py-3">Descanso</th>
                      <th className="px-4 py-3 text-right">Execução</th>
                    </tr>
                  </thead>
                  <tbody>
                    {phase.exercises.map((exercise) => (
                      <tr key={exercise.name} className="border-t border-white/30 text-[rgb(var(--text-primary))] dark:border-white/10">
                        <td className="px-4 py-3 font-semibold">{exercise.name}</td>
                        <td className="px-4 py-3">{exercise.series ?? "—"}</td>
                        <td className="px-4 py-3">{exercise.reps ?? exercise.duration ?? exercise.distance ?? "—"}</td>
                        <td className="px-4 py-3">{exercise.rest ? `${exercise.rest}s` : "Conforme sentir"}</td>
                        <td className="px-4 py-3 text-right">
                          <button className="rounded-full border border-[#0f1f3c]/20 px-3 py-1 text-xs text-[rgb(var(--text-secondary))] transition hover:border-[#32C5FF] hover:text-[#32C5FF]">
                            Ver vídeo
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-[32px] border border-white/30 bg-white/80 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Observações de segurança</p>
          <ul className="mt-4 space-y-3 text-sm text-[rgb(var(--text-secondary))]">
            <li>Use cinta ou suporte ao trabalhar acima de 85% 1RM.</li>
            <li>Marque o descanso com o cronômetro inteligente para manter o estímulo planejado.</li>
            <li>Tempos de execução sugeridos: 2-0-1 nos básicos, 3-1-1 nos acessórios.</li>
          </ul>
        </article>
        <article className="rounded-[32px] border border-white/30 bg-white/80 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Combina com</p>
          <ul className="mt-4 space-y-3 text-sm text-[rgb(var(--text-secondary))]">
            {SAMPLE_WORKOUTS.filter((item) => item.id !== workout.id)
              .slice(0, 2)
              .map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between rounded-2xl border border-white/50 bg-white/70 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/70"
                >
                  <div>
                    <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{item.name}</p>
                    <p className="text-xs text-[rgb(var(--text-subtle))]">
                      {item.focus} • {item.durationMinutes} min
                    </p>
                  </div>
                  <WorkoutLink workoutId={item.id} className="text-xs font-semibold text-[color:rgb(var(--color-accent-primary))]">
                    Abrir →
                  </WorkoutLink>
                </li>
              ))}
          </ul>
        </article>
      </section>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-4 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-white/60">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
