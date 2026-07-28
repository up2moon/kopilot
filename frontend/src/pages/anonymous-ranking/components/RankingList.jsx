import RankingItem from './RankingItem'

export default function RankingList({ rankings }) {
  return (
    <section className="top-ranking-list-section">
      <h2 className="section-title">전체 랭킹</h2>
      <div className="ranking-list">
        {rankings.map((item) => (
          <RankingItem item={item} key={item.userId} />
        ))}
      </div>
    </section>
  )
}
