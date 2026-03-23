import { SimulationDashboard } from "./DashboardClient";

export default async function SimulationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SimulationDashboard simulationId={id} />;
}
