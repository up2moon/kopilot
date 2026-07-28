import timerIcon from '../../../assets/icons/timer-icon.svg'

export default function RankingNotice({ notice }) {
  return (
    <div className="ranking-notice-bar">
      <img className="notice-icon" src={timerIcon} alt="" aria-hidden="true" />
      <span className="notice-text">{notice}</span>
    </div>
  )
}
