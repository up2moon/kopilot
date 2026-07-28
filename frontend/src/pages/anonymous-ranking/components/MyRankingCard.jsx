import {
  formatCurrency,
  formatPoints,
} from '../utils/formatters'

export default function MyRankingCard({ ranking }) {
  if (!ranking) return null

  return (
    <section className="my-ranking-card-section">
      <div className="my-ranking-card">
        <div className="my-ranking-left">
          <div className="my-avatar-box">
            <span className="avatar-emoji">
              {ranking.avatarEmoji || '🐨'}
            </span>
          </div>
          <div className="my-info">
            <div className="my-nickname-row">
              <span className="my-nickname">
                {ranking.anonymousNickname}
              </span>
              <span className="me-tag">내 프로필</span>
            </div>
            <div className="my-stats">
              <span className="stat-label">이번 달 예상 절약</span>
              <span className="stat-amount">
                {formatCurrency(ranking.savedAmount)}
              </span>
            </div>
            <div className="my-points-row">
              <span>
                랭킹 점수{' '}
                <strong>{formatPoints(ranking.rankScore)}</strong>
              </span>
              <span className="dot-divider">•</span>
              <span>
                미션 {ranking.completedChallengesCount || 0}회 성공
              </span>
            </div>
          </div>
        </div>
        <div className="my-ranking-right">
          <div className="my-rank-badge">
            <span className="rank-num">{ranking.rank}</span>
            <span className="rank-unit">위</span>
          </div>
        </div>
      </div>
    </section>
  )
}
