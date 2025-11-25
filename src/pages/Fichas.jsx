import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useFichas } from "../hooks/useFichas.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { resolveMediaUrl } from "../utils/media.js";

const FALLBACK_THUMBNAIL = "https://images.unsplash.com/photo-1558611848-73f7eb4001a1?auto=format&fit=crop&w=900&q=80";
const LEVEL_COLORS = {
  iniciante: "from-[#C3F8FF] via-[#8EDAFF] to-[#46A5FF]",
  intermediario: "from-[#FFE29F] via-[#FFA99F] to-[#FF719A]",
  avancado: "from-[#5EFCE8] via-[#39C0FF] to-[#2F80ED]",
};
const VARIANT_BADGES = {
  template: { label: "Template oficial", tone: "bg-white/20 text-white" },
  community: { label: "Comunidade", tone: "bg-[#67FF9A]/20 text-[#67FF9A]" },
  personal: { label: "Minha ficha", tone: "bg-[#32C5FF]/20 text-[#32C5FF]" },
};

function normalizeDays(value) {
  if (Array.isArray(value) && value.length > 0) return value;
  if (typeof value === "string" && value.trim()) {
    return value.split(",").map((day) => day.trim());
  }
  return [];
}

function normalizeLevelKey(level) {
  if (!level) return "Todos";
  return level.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function HighlightBadge({ label }) {
  if (!label) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/80">
      <span className="h-1.5 w-1.5 rounded-full bg-[#67FF9A]" />
      {label}
    </span>
  );
}

function PremiumCard({ ficha, variant = "template" }) {
  const { id, nome, descricao, objetivo, nivel, foco, dias_semana: diasSemana, thumbnail_url: thumbnail, capa_url: capaUrl } = ficha;

  const normalizedLevel = normalizeLevelKey(nivel);
  const levelGradient = LEVEL_COLORS[normalizedLevel] ?? LEVEL_COLORS.iniciante;
  const normalizedDays = normalizeDays(diasSemana);
  const previewImage = resolveMediaUrl(capaUrl || thumbnail) || FALLBACK_THUMBNAIL;
  const badge = VARIANT_BADGES[variant] ?? VARIANT_BADGES.template;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#040d1f] via-[#0f1f3c] to-[#050914] shadow-[0_20px_60px_rgba(3,8,25,0.5)]">
      <div className="relative h-56 overflow-hidden">
        <div className="absolute left-4 top-4 z-10">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${badge.tone}`}>{badge.label}</span>
        </div>
        <img
          src={previewImage}
          alt={nome}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#040d1f]/90 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-white">
          <span className={`rounded-full bg-gradient-to-r ${levelGradient} px-3 py-1 text-[11px] tracking-wide text-[#050914]`}>{nivel ?? "Nivel livre"}</span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-white/80">{objetivo ?? "Objetivo flexivel"}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-6 pb-6 pt-5 text-white">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">Ficha premium</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-white">{nome ?? "Ficha sem nome"}</h2>
          <p className="mt-3 text-sm text-white/70">{descricao ?? "Descricao indisponivel para esta ficha. Ajuste no Supabase para detalhar melhor."}</p>
        </div>

        <div className="flex flex-wrap gap-2 text-sm text-white/80">
          {foco && <HighlightBadge label={foco} />}
          {normalizedDays.length > 0 && <HighlightBadge label={normalizedDays.join(" / ")} />}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-white/10 pt-4 text-sm text-white/70">
          <div className="flex flex-1 flex-col">
            <span className="text-xs uppercase tracking-[0.3em] text-white/40">Objetivo</span>
            <span className="text-sm font-semibold text-white">{objetivo ?? "Custom"}</span>
          </div>
          <Link
            to={`/fichas/${id ?? ""}`}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/60 hover:bg-white/20"
          >
            Abrir ficha
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 12h14m0 0-5-5m5 5-5 5" />
            </svg>
          </Link>
        </div>
      </div>
    </article>
  );
}

function GridSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={`skeleton-${index}`} className="animate-pulse rounded-[28px] border border-white/10 bg-white/5 p-6">
          <div className="h-44 rounded-2xl bg-white/10" />
          <div className="mt-5 space-y-3">
            <div className="h-5 rounded-full bg-white/10" />
            <div className="h-4 rounded-full bg-white/10" />
            <div className="h-4 rounded-full bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionBlock({ section }) {
  const { title, subtitle, query, variant, emptyMessage } = section;
  const { items, loading, error, reload } = query;

  return (
    <section className="space-y-4 rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-xl dark:bg-slate-900/70">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">{title}</p>
          <h2 className="text-2xl font-semibold text-white">{subtitle}</h2>
        </div>
        <button
          type="button"
          onClick={reload}
          className="rounded-2xl border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/60"
        >
          Recarregar
        </button>
      </div>
      {error && <p className="text-sm text-[#FF8F8F]">{error}</p>}
      {loading ? (
        <GridSkeleton />
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/20 p-6 text-center text-white">
          <p className="font-semibold">{emptyMessage}</p>
          <p className="mt-2 text-sm text-white/70">Tente alterar a busca ou cadastrar novas fichas no Supabase.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {items.map((ficha) => (
            <PremiumCard key={ficha.id ?? ficha.nome} ficha={ficha} variant={variant} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function FichasPage() {
  const [search, setSearch] = useState("");
  const { user } = useAuth();

  const recommendedQuery = useFichas({
    search,
    limit: 60,
    visibilidade: "publica",
    templatesOnly: true,
  });

  const communityQuery = useFichas({
    search,
    limit: 60,
    visibilidade: "publica",
    communityOnly: true,
    excludeUsuarioId: user?.id,
  });

  const personalQuery = useFichas({
    search,
    limit: 60,
    usuarioId: user?.id,
    enabled: Boolean(user?.id),
  });

  const sections = useMemo(
    () => [
      {
        id: "templates",
        title: "Fichas recomendadas",
        subtitle: "Templates oficiais criados por voce",
        query: recommendedQuery,
        variant: "template",
        emptyMessage: "Nenhum template publico encontrado ainda.",
      },
      {
        id: "community",
        title: "Fichas da comunidade",
        subtitle: "Fichas publicas compartilhadas por outros usuarios",
        query: communityQuery,
        variant: "community",
        emptyMessage: "Ainda nao existem fichas publicas para este filtro.",
      },
    ],
    [communityQuery, recommendedQuery],
  );

  const handleRefreshAll = () => {
    recommendedQuery.reload();
    communityQuery.reload();
    personalQuery.reload();
  };

  return (
    <div className="space-y-10">
      <header className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#070f23] via-[#0f1f3c] to-[#050914] p-8 text-white shadow-[0_25px_60px_rgba(3,8,25,0.45)]">
        <p className="text-xs uppercase tracking-[0.4em] text-white/60">Biblioteca MEU SHAPE</p>
        <div className="mt-4 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold leading-tight lg:text-4xl">Fichas de treino premium prontas para aplicar.</h1>
            <p className="mt-4 text-white/70">
              Toda ficha aqui ja vem com series, tempos de descanso e instrucoes. Buscamos direto do Supabase, incluindo templates oficiais e fichas publicas da comunidade.
            </p>
          </div>
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/5 p-5 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Busca rapida</p>
            <div className="mt-3 flex gap-3">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por objetivo, nivel ou nome"
                className="flex-1 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:border-white/60 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleRefreshAll}
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/60"
              >
                Atualizar
              </button>
            </div>
            <p className="mt-2 text-xs text-white/60">
              Buscamos direto da tabela configurada no Supabase (padrao: fichas) com filtros por visibilidade, usuario e busca textual.
            </p>
          </div>
        </div>
      </header>

      {sections.map((section) => (
        <SectionBlock key={section.id} section={section} />
      ))}

      <section className="space-y-4 rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-xl dark:bg-slate-900/70">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Minhas fichas</p>
            <h2 className="text-2xl font-semibold text-white">Blocos que voce salvou ou criou</h2>
            <p className="mt-1 text-sm text-white/70">Somente voce enxerga fichas privadas; as publicas tambem aparecem no catalogo geral.</p>
          </div>
          {user && (
            <Link
              to="/treinos/novo"
              className="rounded-2xl bg-gradient-to-r from-[#32C5FF] to-[#67FF9A] px-5 py-3 text-sm font-semibold text-[#050914] shadow-lg shadow-[#32C5FF]/40"
            >
              Cadastrar nova ficha
            </Link>
          )}
        </div>

        {!user ? (
          <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#050b18] to-[#0d1629] p-8 text-white">
            <p className="text-sm uppercase tracking-[0.35em] text-white/40">Disponivel apos login</p>
            <h3 className="mt-3 text-2xl font-semibold">Entre para acessar fichas privadas</h3>
            <p className="mt-2 text-white/70">Faca login para ver as fichas que voce criou, duplicou ou recebeu do coach.</p>
            <Link
              to="/login"
              className="mt-5 inline-flex items-center justify-center rounded-2xl border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/60"
            >
              Fazer login
            </Link>
          </div>
        ) : personalQuery.loading ? (
          <GridSkeleton />
        ) : personalQuery.items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/20 p-8 text-center text-white">
            <p className="text-lg font-semibold">Nenhuma ficha salva por enquanto.</p>
            <p className="mt-2 text-sm text-white/70">Escolha um template ou duplique uma ficha da comunidade para montar seu plano.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={personalQuery.reload}
                className="rounded-2xl border border-white/30 px-5 py-2 text-sm font-semibold text-white transition hover:border-white/60"
              >
                Recarregar
              </button>
              <Link
                to="/treinos/novo"
                className="rounded-2xl bg-gradient-to-r from-[#32C5FF] to-[#67FF9A] px-5 py-2 text-sm font-semibold text-[#050914] shadow-lg shadow-[#32C5FF]/40"
              >
                Criar ficha agora
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {personalQuery.items.map((ficha) => (
              <PremiumCard key={ficha.id ?? ficha.nome} ficha={ficha} variant="personal" />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

