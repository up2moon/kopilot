export default function RankingNotice({ notice }) {
  return (
    <div className="ranking-notice-bar">
      <span className="notice-icon" aria-hidden="true">
        ⏱️
      </span>
      <span className="notice-text">{notice}</span>
    </div>
  )
}
