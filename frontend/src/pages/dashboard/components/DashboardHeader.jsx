import kospayLogo from "../../../assets/kospay-logo.png";

export default function DashboardHeader({ nickname, onNavigate }) {
  return (
    <header className="dash-top-bar">
      <div className="brand-lockup">
        <img
          className="logo-mark"
          src={kospayLogo}
          alt=""
          aria-hidden="true"
        />
      </div>

      <button
        className="user-profile-pill"
        type="button"
        onClick={() => onNavigate("/my")}
        title="마이페이지"
      >
        <div className="user-avatar-circle">{nickname.charAt(0)}</div>
        <span className="user-name">{nickname}님</span>
      </button>
    </header>
  );
}
