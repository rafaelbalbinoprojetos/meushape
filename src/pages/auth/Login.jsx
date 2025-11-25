import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext.jsx";
import { supabase } from "../../lib/supabase.js";
import ThemeSwitcher from "../../components/ThemeSwitcher.jsx";

const LOGIN_BACKGROUNDS = [
  "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1600&q=80",
];

const TERMS_URL = import.meta.env.VITE_TERMS_URL ?? "#";
const PRIVACY_URL = import.meta.env.VITE_PRIVACY_URL ?? "#";

export default function LoginPage() {
  const { signIn, session, error } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [authNotice, setAuthNotice] = useState(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [emailStatus, setEmailStatus] = useState("idle"); // idle | typing | checking | new | existing
  const [resettingPassword, setResettingPassword] = useState(false);

  const heroImage = useMemo(() => {
    if (LOGIN_BACKGROUNDS.length === 0) return null;
    return LOGIN_BACKGROUNDS[Math.floor(Math.random() * LOGIN_BACKGROUNDS.length)];
  }, []);

  useEffect(() => {
    if (session) {
      const redirectTo = location.state?.from?.pathname ?? "/";
      navigate(redirectTo, { replace: true });
    }
  }, [navigate, location.state, session]);

  const emailHelperText = useMemo(() => {
    if (!formData.email) {
      return "Digite seu email para fazer login ou criar um cadastro em segundos.";
    }
    if (!formData.email.includes("@")) {
      return "Use um email v�lido, por exemplo: você@exemplo.com";
    }
    if (emailStatus === "new") {
      return "Detectamos um novo email. Enviaremos um link de confirma��o para o seu endere�o.";
    }
    return "Se j� existir uma conta, faremos o login. Caso contr�rio, criaremos uma para voc�.";
  }, [emailStatus, formData.email]);

  const emailHelperTone = emailStatus === "new" ? "text-emerald-600 dark:text-emerald-300" : "text-slate-500 dark:text-slate-400";

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    if (name === "email") {
      setEmailStatus(value ? "typing" : "idle");
      setAuthNotice(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setFormError(null);
    setAuthNotice(null);
    setEmailStatus("checking");

    try {
      const result = await signIn({ email: formData.email, password: formData.password });

      if (result.status === "sign-up") {
        setEmailStatus("new");
        const normalizedEmail = formData.email.trim().toLowerCase();

        if (result.requiresEmailConfirmation) {
          toast.success(`Conta criada! Confirme pelo link enviado para ${normalizedEmail}.`);
          setAuthNotice(`?Ys? Conta criada! Confirme o email ${normalizedEmail} para come�ar a usar o MEU SHAPE.`);
        } else {
          toast.success("Conta criada com sucesso! Estamos preparando o seu ambiente.");
          setAuthNotice("?Ys? Conta criada! Aproveite seu per�odo de teste Premium por 7 dias.");
        }
      } else {
        setEmailStatus("existing");
        toast.success("Login realizado com sucesso.");
      }
    } catch (submitError) {
      const message = submitError?.message ?? "N�o foi poss�vel entrar. Verifique os dados.";
      setFormError(message);
      setEmailStatus(submitError?.code === "existing_user_wrong_password" ? "existing" : "idle");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail) {
      setFormError("Informe seu email para receber o link de recupera��o.");
      return;
    }

    setResettingPassword(true);
    setFormError(null);
    setAuthNotice(null);
    try {
      const redirectTo = import.meta.env.VITE_SUPABASE_RESET_REDIRECT ?? `${window.location.origin}/recuperar-senha`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo,
      });

      if (resetError) {
        throw resetError;
      }

      toast.success(`Enviamos um link de recupera��o para ${trimmedEmail}.`);
      setAuthNotice(`Enviamos um link de recupera��o para ${trimmedEmail}. Verifique sua caixa de entrada e spam.`);
    } catch (resetError) {
      const message = resetError?.message ?? "N�o foi poss�vel enviar o link de recupera��o.";
      setFormError(message);
    } finally {
      setResettingPassword(false);
    }
  };

  const togglePasswordVisibility = () => {
    setPasswordVisible((previous) => !previous);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 px-4 py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-5xl overflow-hidden rounded-[34px] border border-white/10 bg-white/15 shadow-2xl shadow-black/40 backdrop-blur-3xl dark:border-white/10">
        <div
          className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/10 to-white/5 dark:from-slate-900/70 dark:via-slate-900/40 dark:to-slate-900/60"
          aria-hidden="true"
        />

        <div className="relative grid grid-cols-1 overflow-hidden md:grid-cols-[1.25fr,1fr]">
          <div className="relative flex min-h-[260px] flex-col justify-between overflow-hidden bg-slate-900/80">
            {heroImage && (
              <img
                src={heroImage}
                alt="Cole��o de investimentos e finan�as pessoais"
                className="absolute inset-0 h-full w-full object-cover opacity-90"
                loading="lazy"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-slate-900/55 to-emerald-600/45" aria-hidden="true" />

            <div className="relative z-10 flex flex-col gap-8 p-10 text-slate-100">
              <div className="space-y-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                  MEU SHAPE
                </span>
                <h3 className="text-3xl font-semibold leading-snug text-white/95">
                  Simplifique seu controle financeiro.
                </h3>
                <p className="text-sm text-slate-200/80">
                  Assistente financeiro com IA para o seu dia a dia. Visualize despesas, rendas, investimentos e metas em um s� lugar.
                  Decis�es mais seguras para o seu futuro.
                </p>
              </div>

              <div className="space-y-4 text-sm text-slate-200/70">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-emerald-200">
                    <span className="text-lg" aria-hidden="true">
                      ?s?
                    </span>
                  </div>
                  <p>
                    Acesso imediato ao plano gratuito e 7 dias com todos os recursos Premium ??" IA financeira, voz, relat�rios inteligentes e
                    exporta��es.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-emerald-200">
                    <span className="text-lg" aria-hidden="true">
                      ?Y"?
                    </span>
                  </div>
                  <p>Se j� tiver cadastro, basta informar sua senha. Se for novo por aqui, criamos sua conta automaticamente.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative bg-white/95 px-8 py-10 sm:px-10 md:pl-12 md:pr-10 dark:bg-slate-950/90">
            <div className="absolute -top-16 right-10 h-32 w-32 rounded-full bg-emerald-200/10 blur-3xl" aria-hidden="true" />
            <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-sky-200/10 blur-3xl" aria-hidden="true" />

            <div className="relative flex items-start justify-between">
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Bem-vindo</h1>
                <p className="text-sm text-slate-500 dark:text-slate-300">Use o mesmo formul�rio para entrar ou criar sua conta em segundos.</p>
              </div>
              <div className="-mr-2">
                <ThemeSwitcher />
              </div>
            </div>

            <form className="relative mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect="off"
                  enterKeyHint="next"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-[0_15px_40px_-20px_rgba(15,23,42,0.35)] focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-emerald-300"
                  placeholder="você@exemplo.com"
                />
                <p className={`text-xs leading-relaxed ${emailHelperTone}`}>{emailHelperText}</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={passwordVisible ? "text" : "password"}
                    autoComplete="current-password"
                    enterKeyHint="done"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-white/70 px-4 py-3 pr-12 text-sm text-slate-900 shadow-[0_15px_40px_-20px_rgba(15,23,42,0.35)] focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-emerald-300"
                    placeholder="????????????????????????"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-500 transition hover:text-emerald-600 dark:text-emerald-300 dark:hover:text-emerald-200"
                    aria-pressed={passwordVisible}
                  >
                    {passwordVisible ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={resettingPassword || loading}
                    className="text-xs font-semibold text-emerald-600 transition hover:text-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 dark:text-emerald-300 dark:hover:text-emerald-200"
                  >
                    {resettingPassword ? "Enviando link de recupera��o..." : "Esqueci minha senha"}
                  </button>
                </div>
              </div>

              {(formError || error) && (
                <div
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 shadow-inner dark:border-rose-400/30 dark:bg-rose-500/15 dark:text-rose-200"
                  role="alert"
                >
                  {formError || error?.message || "N�o foi poss�vel entrar. Verifique os dados."}
                </div>
              )}

              {authNotice && (
                <div
                  className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 shadow-inner dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200"
                  role="status"
                >
                  {authNotice}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-sky-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:from-emerald-500 hover:to-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Conectando..." : "Entrar ou Criar conta"}
              </button>

              <p className="text-center text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
                Ao criar, voc� concorda com nossos{" "}
                <a href={TERMS_URL} target="_blank" rel="noreferrer" className="font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-300">
                  termos de uso
                </a>{" "}
                e{" "}
                <a href={PRIVACY_URL} target="_blank" rel="noreferrer" className="font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-300">
                  pol�tica de privacidade
                </a>
                .
              </p>
            </form>

            <p className="relative mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
              Em breve: login com Google ou Apple para agilizar ainda mais seu acesso.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

