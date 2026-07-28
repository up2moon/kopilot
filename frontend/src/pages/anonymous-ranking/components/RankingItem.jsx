import {
  formatCurrency,
  formatPoints,
} from '../utils/formatters'

const medalIcons = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
}

export default function RankingItem({ item }) {
  const isTopThree = item.rank <= 3
  const medalIcon = medalIcons[item.rank]

  return (
    <div
      className={`ranking-item ${
        isTopThree ? `top3 rank-${item.rank}` : ''
      } ${item.isMe ? 'is-me-item' : ''}`}
    >
      <div className="item-rank-col">
        {medalIcon ? (
          <span className="medal-icon" title={`${item.rank}위`}>
            {medalIcon}
          </span>
        ) : (
          <span className="rank-number-label">{item.rank}</span>
        )}
      </div>

      <div className="item-avatar-col">
        <span className="item-avatar-emoji">
          {item.avatarEmoji || '👤'}
        </span>
      </div>

      <div className="item-info-col">
        <div className="item-name-row">
          <span className="item-nickname">{item.anonymousNickname}</span>
          {item.isMe && <span className="item-me-pill">나</span>}
        </div>
        <span className="item-sub-text">
          {item.consumptionDna
            ? `${item.consumptionDna.emoji} ${item.consumptionDna.nickname}`
            : `절약 ${formatCurrency(item.savedAmount)}`}
        </span>
      </div>

      <div className="item-score-col">
        <span className="item-score">
          {formatPoints(item.rankScore)}
        </span>
      </div>
    </div>
  )
}
