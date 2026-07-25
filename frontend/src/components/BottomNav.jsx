import './BottomNav.css'

const navItems = [
  { path: '/dashboard', label: '홈', icon: '🏠' },
  { path: '/ranking', label: '랭킹', icon: '🏆' },
  { path: '/challenge', label: '챌린지', icon: '🎯' },
  { path: '/investment-effect', label: '투자효과', icon: '📈' },
  { path: '/my', label: '마이', icon: '👤' },
]

export default function BottomNav({ currentPath, onNavigate }) {
  return (
    <nav className="bottom-nav" aria-label="하단 메뉴">
      {navItems.map((item) => {
        const isActive = currentPath === item.path

        return (
          <button
            key={item.path}
            type="button"
            className={`bottom-nav-item${isActive ? ' is-active' : ''}`}
            onClick={() => onNavigate(item.path)}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
            {isActive && <span className="bottom-nav-dot" aria-hidden="true" />}
          </button>
        )
      })}
    </nav>
  )
}
