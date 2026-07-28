import ChallengeProgress from './ChallengeProgress'
import formatWon from '../utils/formatWon'

function ChallengeResult({ challenge }) {
  if (challenge.status === 'IN_PROGRESS') {
    return (
      <p className="challenge-verify-notice">
        미션 인증은 다음 날 자정부터 이번 주 미션 목록에서 할 수 있어요.
      </p>
    )
  }

  if (challenge.status === 'SUCCESS') {
    return (
      <p className="challenge-result-notice success">
        미션 완료! {challenge.point}P를 받았어요.
      </p>
    )
  }

  if (challenge.status === 'FAIL') {
    return (
      <p className="challenge-result-notice fail">
        이번 미션은 미완료예요.
      </p>
    )
  }

  return null
}

export default function TodayChallengeCard({ challenge }) {
  return (
    <section className="today-challenge-card" aria-label="오늘의 미션">
      <span className="today-challenge-label">오늘의 랜덤 미션</span>
      <p className="today-challenge-category">{challenge.category}</p>
      <h2>{challenge.title}</h2>
      <p className="today-challenge-description">{challenge.description}</p>
      {challenge.estimatedSavingAmount > 0 && (
        <p className="today-challenge-saving">
          예상 절약 {formatWon(challenge.estimatedSavingAmount)}
        </p>
      )}
      <ChallengeProgress challenge={challenge} />
      <ChallengeResult challenge={challenge} />
    </section>
  )
}
