import "./BottomNav.css";

const navItems = [
  { path: "/dashboard", label: "홈", icon: "⌂" },
  { path: "/roadmap", label: "로드맵", icon: "⌁" },
  { path: "/coach", label: "챗봇", icon: "✦" },
  { path: "/my", label: "마이", icon: "◉" },
];

export default function BottomNav({ currentPath, onNavigate }) {
  return (
    <nav className="bottom-nav" aria-label="하단 메뉴">
      {navItems.map((item) => {
        const isActive = currentPath === item.path;

        return (
          <button
            key={item.path}
            type="button"
            className={`bottom-nav-item${isActive ? " is-active" : ""}`}
            onClick={() => onNavigate(item.path)}
          >
            <span className="bottom-nav-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="bottom-nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
