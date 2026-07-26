import { useEffect, useState } from 'react'
import { getMyRanking, getTopRankings } from '../services/ranking.js'
import './AnonymousRankingPage.css'

export default function AnonymousRankingPage({ token, onNavigate }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [myRanking, setMyRanking] = useState(null)
  const [topRankings, setTopRankings] = useState([])
  const [notice, setNotice] = useState('1시간마다 갱신')

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError('')
        const res = await getTopRankings(token, 20)
        setMyRanking(res.myRanking)
        setTopRankings(res.topRankings || [])
        if (res.updatedAtNotice) {
          setNotice(res.updatedAtNotice)
        }
      } catch (err) {
        console.error('Failed to load ranking data:', err)
        setError(err.message || '랭킹 정보를 불러오는데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      loadData()
    }
  }, [token])

  const formatCurrency = (amt) => {
    return (amt || 0).toLocaleString('ko-KR') + '원'
  }

  const formatPoints = (pts) => {
    return (pts || 0).toLocaleString('ko-KR') + ' pt'
  }

  return (
    <div className="ranking-page-container">
      {/* 1. Header Bar with Home Button */}
      <header className="ranking-header">
        <div className="ranking-header-title-group">
          <h1>익명 랭킹</h1>
          <p className="ranking-header-subtitle">
            이번 달 나와 동료들의 절약 성과를 확인해요
          </p>
        </div>
      </header>

      {/* Update Notice Badge */}
      <div className="ranking-notice-bar">
        <span className="notice-icon" aria-hidden="true">⏱️</span>
        <span className="notice-text">{notice}</span>
      </div>

      {loading ? (
        <div className="ranking-loading-state">
          <div className="loading-spinner" />
          <p>절약 랭킹 순위를 집계하고 있어요...</p>
        </div>
      ) : error ? (
        <div className="ranking-error-state">
          <p>{error}</p>
          <button
            type="button"
            className="retry-btn"
            onClick={() => window.location.reload()}
          >
            다시 시도하기
          </button>
        </div>
      ) : (
        <>
          {/* 2. My Ranking Card */}
          {myRanking && (
            <section className="my-ranking-card-section">
              <div className="my-ranking-card">
                <div className="my-ranking-left">
                  <div className="my-avatar-box">
                    <span className="avatar-emoji">{myRanking.avatarEmoji || '🐨'}</span>
                  </div>
                  <div className="my-info">
                    <div className="my-nickname-row">
                      <span className="my-nickname">{myRanking.anonymousNickname}</span>
                      <span className="me-tag">내 프로필</span>
                    </div>
                    <div className="my-stats">
                      <span className="stat-label">이번 달 예상 절약</span>
                      <span className="stat-amount">{formatCurrency(myRanking.savedAmount)}</span>
                    </div>
                    <div className="my-points-row">
                      <span>랭킹 점수 <strong>{formatPoints(myRanking.rankScore)}</strong></span>
                      <span className="dot-divider">•</span>
                      <span>미션 {myRanking.completedChallengesCount || 0}회 성공</span>
                    </div>
                  </div>
                </div>
                <div className="my-ranking-right">
                  <div className="my-rank-badge">
                    <span className="rank-num">{myRanking.rank}</span>
                    <span className="rank-unit">위</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 3. Top Ranking List Section */}
          <section className="top-ranking-list-section">
            <h2 className="section-title">전체 랭킹</h2>

            <div className="ranking-list">
              {topRankings.map((item) => {
                const isTop3 = item.rank <= 3
                let medalIcon = null
                if (item.rank === 1) medalIcon = '🥇'
                else if (item.rank === 2) medalIcon = '🥈'
                else if (item.rank === 3) medalIcon = '🥉'

                return (
                  <div
                    key={item.userId}
                    className={`ranking-item ${isTop3 ? `top3 rank-${item.rank}` : ''} ${
                      item.isMe ? 'is-me-item' : ''
                    }`}
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
                      <span className="item-avatar-emoji">{item.avatarEmoji || '👤'}</span>
                    </div>

                    <div className="item-info-col">
                      <div className="item-name-row">
                        <span className="item-nickname">{item.anonymousNickname}</span>
                        {item.isMe && <span className="item-me-pill">나</span>}
                      </div>
                      <span className="item-sub-text">
                        절약 {formatCurrency(item.savedAmount)}
                      </span>
                    </div>

                    <div className="item-score-col">
                      <span className="item-score">{formatPoints(item.rankScore)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
