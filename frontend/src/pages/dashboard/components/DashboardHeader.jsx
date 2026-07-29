import kospayLogo from "../../../assets/kospay-logo.png";

export default function DashboardHeader() {
  return (
    <header className="dash-top-bar">
      <div className="brand-lockup">
        <img
          className="logo-mark"
          src={kospayLogo}
          alt=""
          aria-hidden="true"
        />
        <span className="dash-brand-name">
          <span>Kos</span>pay
        </span>
      </div>
    </header>
  );
}
