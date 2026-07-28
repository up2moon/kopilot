import homeIcon from "../assets/icons/home_filled.svg";
import rankingIcon from "../assets/icons/rank-icon.svg";
import challengeIcon from "../assets/icons/outlined_flag.svg";
import investmentIcon from "../assets/icons/invest.svg";
import myIcon from "../assets/icons/my.svg";
import "./BottomNav.css";

const navItems = [
  { path: "/dashboard", label: "홈", icon: homeIcon },
  { path: "/ranking", label: "랭킹", icon: rankingIcon },
  { path: "/challenge", label: "챌린지", icon: challengeIcon },
  { path: "/investment-effect", label: "투자효과", icon: investmentIcon },
  { path: "/my", label: "마이", icon: myIcon },
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
            <img
              className="bottom-nav-icon-img"
              src={item.icon}
              alt={item.label}
            />
            <span className="bottom-nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
