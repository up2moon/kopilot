export default function MyProfileCard({ user }) {
  const nickname = user?.nickname || user?.name || '진원'
  const secondaryText =
    user?.email ||
    (user?.myDataConnected ? '마이데이터 연동됨' : '마이데이터 미연동')

  return (
    <section className="mypage-profile-card">
      <div className="mypage-avatar" aria-hidden="true">
        🙂
      </div>
      <div className="mypage-profile-info">
        <span className="mypage-profile-name">{nickname}님</span>
        <span className="mypage-profile-sub">{secondaryText}</span>
      </div>
    </section>
  )
}
