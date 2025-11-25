import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./layout/Layout.jsx";
import DashboardPage from "./pages/Dashboard.jsx";
import WorkoutsPage from "./pages/Workouts.jsx";
import WorkoutDetailsPage from "./pages/WorkoutDetails.jsx";
import WorkoutBuilderPage from "./pages/WorkoutBuilder.jsx";
import CoachPage from "./pages/Coach.jsx";
import SettingsPage from "./pages/Settings.jsx";
import NutritionPage from "./pages/Nutrition.jsx";
import LoginPage from "./pages/auth/Login.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import EvolutionPage from "./pages/Evolution.jsx";
import FichasPage from "./pages/Fichas.jsx";
import FichaDetailsPage from "./pages/FichaDetails.jsx";
import FichaEditPage from "./pages/FichaEdit.jsx";
import ExercisesPage from "./pages/Exercises.jsx";
import ExerciseDetailsPage from "./pages/ExerciseDetails.jsx";

function App() {
  return (
    <BrowserRouter>
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
            <Route path="fichas" element={<FichasPage />} />
            <Route path="fichas/:fichaId" element={<FichaDetailsPage />} />
            <Route path="fichas/:fichaId/editar" element={<FichaEditPage />} />
            <Route path="exercicios" element={<ExercisesPage />} />
            <Route path="exercicios/:exerciseId" element={<ExerciseDetailsPage />} />
            <Route path="perfil" element={<SettingsPage />} />

            {/* Rotas antigas mantidas temporariamente para compatibilidade */}
            <Route path="biblioteca/*" element={<Navigate to="/treinos" replace />} />
            <Route path="assistente" element={<Navigate to="/coach" replace />} />
            <Route path="chatbot" element={<Navigate to="/coach" replace />} />
            <Route path="juros-compostos" element={<Navigate to="/nutricao" replace />} />
            <Route path="configuracoes" element={<Navigate to="/perfil" replace />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;


