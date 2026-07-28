import DashboardContent from "./components/DashboardContent";
import DashboardGreeting from "./components/DashboardGreeting";
import DashboardHeader from "./components/DashboardHeader";
import useDashboardData from "./hooks/useDashboardData";
import "./DashboardPage.css";

export default function DashboardPage({ auth, onNavigate }) {
  const user = auth?.user;
  const nickname = user?.nickname || user?.name || "진원";
  const { data, coaching, isLoading, errorMessage } = useDashboardData(
    auth?.accessToken,
  );

  return (
    <div className="dashboard-page">
      <DashboardHeader nickname={nickname} onNavigate={onNavigate} />
      <DashboardGreeting nickname={nickname} />
      <DashboardContent
        coaching={coaching}
        data={data}
        errorMessage={errorMessage}
        isLoading={isLoading}
        onNavigate={onNavigate}
      />
    </div>
  );
}
