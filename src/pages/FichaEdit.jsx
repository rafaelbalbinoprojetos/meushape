import { useParams } from "react-router-dom";
import WorkoutBuilderPage from "./WorkoutBuilder.jsx";

export default function FichaEditPage() {
  const { fichaId } = useParams();
  return <WorkoutBuilderPage baseFichaId={fichaId ?? null} />;
}
