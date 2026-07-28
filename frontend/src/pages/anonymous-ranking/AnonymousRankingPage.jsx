import NavigationPageLayout from '../../components/NavigationPageLayout'
import ConsumptionDnaCard from './components/ConsumptionDnaCard'
import MyRankingCard from './components/MyRankingCard'
import RankingList from './components/RankingList'
import RankingNotice from './components/RankingNotice'
import RankingState from './components/RankingState'
import useAnonymousRanking from './hooks/useAnonymousRanking'
import './AnonymousRankingPage.css'

export default function AnonymousRankingPage({ token }) {
  const {
    consumptionDna,
    dnaError,
    dnaLoading,
    error,
    loading,
    myRanking,
    notice,
    refreshDna,
    topRankings,
  } = useAnonymousRanking(token)

  return (
    <NavigationPageLayout
      className="ranking-page-container"
      title="익명 랭킹"
      content="이번 달 나와 동료들의 절약 성과를 확인해요"
    >
      <RankingNotice notice={notice} />
      <ConsumptionDnaCard
        consumptionDna={consumptionDna}
        error={dnaError}
        loading={dnaLoading}
        onRefresh={refreshDna}
      />

      <RankingState error={error} loading={loading} />

      {!loading && !error ? (
        <>
          <MyRankingCard ranking={myRanking} />
          <RankingList rankings={topRankings} />
        </>
      ) : null}
    </NavigationPageLayout>
  )
}
