import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../lib/supabase.js";

const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  error: null,
  signIn: async () => {},
  signOut: async () => {},
  refreshUser: async () => {},
  updateUserMetadata: async () => {},
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function init() {
      setLoading(true);
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (ignore) return;

      if (sessionError) {
        setError(sessionError);
      } else {
        setSession(data.session);
        setUser(data.session?.user ?? null);
      }
      setLoading(false);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, updatedSession) => {
      setSession(updatedSession);
      setUser(updatedSession?.user ?? null);
    });

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, []);

  const refreshUser = useCallback(async () => {
    const { data, error: userError } = await supabase.auth.getUser();
    if (userError) {
      setError(userError);
      throw userError;
    }
    setUser(data.user);
    return data.user;
  }, []);

  const updateUserMetadata = useCallback(
    async (patch) => {
      const currentMetadata = user?.user_metadata ?? {};
      const newMetadata = { ...currentMetadata, ...patch };
      const { data, error: updateError } = await supabase.auth.updateUser({
        data: newMetadata,
      });

      if (updateError) {
        setError(updateError);
        throw updateError;
      }

      if (data.user) {
        setUser(data.user);
      }

      return data.user;
    },
    [user],
  );

  const signIn = useCallback(
    async ({ email, password }) => {
      setError(null);
      const normalizedEmail = email.trim().toLowerCase();

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (!signInError) {
        setSession(data.session);
        setUser(data.user);
        return { status: "sign-in", ...data };
      }

      const normalizedMessage = signInError.message?.toLowerCase() ?? "";
      if (!normalizedMessage.includes("invalid login credentials")) {
        setError(signInError);
        throw signInError;
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            plan: "free",
            has_seen_welcome: false,
            trial_status: "eligible",
            trial_started_at: null,
            trial_expires_at: null,
          },
        },
      });

      if (signUpError) {
        const alreadyRegistered = signUpError.message?.toLowerCase().includes("already registered");
        if (alreadyRegistered) {
          const existingUserError = new Error("Email já cadastrado. Verifique a senha ou redefina seu acesso.");
          existingUserError.code = "existing_user_wrong_password";
          setError(existingUserError);
          throw existingUserError;
        }

        setError(signUpError);
        throw signUpError;
      }

      setSession(signUpData.session ?? null);
      setUser(signUpData.user ?? signUpData.session?.user ?? null);

      return {
        status: "sign-up",
        ...signUpData,
        requiresEmailConfirmation: !signUpData.session,
      };
    },
    [],
  );

  const signOut = useCallback(async () => {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError);
      throw signOutError;
    }

    setSession(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      error,
      signIn,
      signOut,
      refreshUser,
      updateUserMetadata,
    }),
    [error, loading, refreshUser, session, signIn, signOut, updateUserMetadata, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
