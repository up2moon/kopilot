import { useState } from 'react'
import instagramLogo from '../../../assets/icons/instagram.svg'

export default function RankingShareButtons() {
  const [message, setMessage] = useState('')

  const handleShare = (service) => {
    setMessage(`${service} 공유 기능은 데모로 제공돼요.`)
  }

  return (
    <div className="ranking-share">
      <span>내 순위 공유하기</span>
      <div className="ranking-share-actions">
        <button
          type="button"
          className="ranking-share-button is-instagram"
          onClick={() => handleShare('Instagram')}
        >
          <img
            className="instagram-mark"
            src={instagramLogo}
            alt=""
            aria-hidden="true"
          />
          Instagram
        </button>
        <button
          type="button"
          className="ranking-share-button is-linkedin"
          onClick={() => handleShare('LinkedIn')}
        >
          <span aria-hidden="true">in</span>
          LinkedIn
        </button>
      </div>
      <small role="status" aria-live="polite">
        {message}
      </small>
    </div>
  )
}
