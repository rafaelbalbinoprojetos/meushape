import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

const Layout = lazy(() => import("./layout/Layout.jsx"));
const DashboardPage = lazy(() => import("./pages/Dashboard.jsx"));
const WorkoutsPage = lazy(() => import("./pages/Workouts.jsx"));
const WorkoutDetailsPage = lazy(() => import("./pages/WorkoutDetails.jsx"));
const WorkoutBuilderPage = lazy(() => import("./pages/WorkoutBuilder.jsx"));
const CoachPage = lazy(() => import("./pages/Coach.jsx"));
const ProfilePage = lazy(() => import("./pages/Profile.jsx"));
const NutritionPage = lazy(() => import("./pages/Nutrition.jsx"));
const LoginPage = lazy(() => import("./pages/auth/Login.jsx"));
const FeedPage = lazy(() => import("./pages/Feed.jsx"));
const EvolutionPage = lazy(() => import("./pages/Evolution.jsx"));
const InsightsPage = lazy(() => import("./pages/Insights.jsx"));
const HistoryPage = lazy(() => import("./pages/History.jsx"));
const FichasPage = lazy(() => import("./pages/Fichas.jsx"));
const FichaDetailsPage = lazy(() => import("./pages/FichaDetails.jsx"));
const FichaEditPage = lazy(() => import("./pages/FichaEdit.jsx"));
const ExercisesPage = lazy(() => import("./pages/Exercises.jsx"));
const ExerciseDetailsPage = lazy(() => import("./pages/ExerciseDetails.jsx"));
const EnergiaPage = lazy(() => import("./pages/Energia.jsx"));
const FichaAtivaPage = lazy(() => import("./pages/FichaAtiva.jsx"));
const LandingPage = lazy(() => import("./pages/Landing.jsx"));
const SubscriptionAdminPage = lazy(() => import("./pages/SubscriptionAdmin.jsx"));

function AppFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 px-4 text-sm font-medium text-slate-200">
      Carregando app...
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<AppFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="treinos" element={<WorkoutsPage />} />
              <Route path="treinos/novo" element={<WorkoutBuilderPage />} />
              <Route path="treinos/:workoutId" element={<WorkoutDetailsPage />} />
              <Route path="coach" element={<CoachPage />} />
              <Route path="nutricao" element={<NutritionPage />} />
              <Route path="evolucao" element={<EvolutionPage />} />
              <Route path="insights" element={<InsightsPage />} />
              <Route path="historico" element={<HistoryPage />} />
              <Route path="feed" element={<FeedPage />} />
              <Route path="fichas" element={<FichasPage />} />
              <Route path="fichas/:fichaId" element={<FichaDetailsPage />} />
              <Route path="fichas/:fichaId/editar" element={<FichaEditPage />} />
              <Route path="fichas/ativa" element={<FichaAtivaPage />} />
              <Route path="exercicios" element={<ExercisesPage />} />
              <Route path="exercicios/:exerciseId" element={<ExerciseDetailsPage />} />
              <Route path="perfil" element={<ProfilePage />} />
              <Route path="plano" element={<LandingPage />} />
              <Route path="energia" element={<EnergiaPage />} />
              <Route path="meu-shape" element={<LandingPage />} />
              <Route path="gestao-assinaturas" element={<SubscriptionAdminPage />} />

              {/* Rotas antigas mantidas temporariamente para compatibilidade */}
              <Route path="biblioteca/*" element={<Navigate to="/treinos" replace />} />
              <Route path="assistente" element={<Navigate to="/coach" replace />} />
              <Route path="chatbot" element={<Navigate to="/coach" replace />} />
              <Route path="juros-compostos" element={<Navigate to="/nutricao" replace />} />
              <Route path="configuracoes" element={<Navigate to="/perfil" replace />} />
              <Route path="insigth" element={<Navigate to="/insights" replace />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
