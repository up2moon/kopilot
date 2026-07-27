import homeIcon from '../assets/icons/nav-home.png'
import rankingIcon from '../assets/icons/nav-ranking.png'
import challengeIcon from '../assets/icons/nav-challenge.png'
import investmentIcon from '../assets/icons/nav-investment.png'
import myIcon from '../assets/icons/nav-my.png'
import './BottomNav.css'

const navItems = [
  { path: '/dashboard', label: '홈', icon: homeIcon },
  { path: '/ranking', label: '랭킹', icon: rankingIcon },
  { path: '/challenge', label: '챌린지', icon: challengeIcon },
  { path: '/investment-effect', label: '투자효과', icon: investmentIcon },
  { path: '/my', label: '마이', icon: myIcon },
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
            <img className='bottom-nav-icon-img' src={item.icon} alt={item.label} />
            <span className="bottom-nav-label">{item.label}</span>
            {isActive && <span className="bottom-nav-dot" aria-hidden="true" />}
          </button>
        )
      })}
    </nav>
  )
}
