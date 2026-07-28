import NavigationPageLayout from "../../components/NavigationPageLayout";
import AssetSearchCard from "./components/AssetSearchCard";
import InvestmentFilters from "./components/InvestmentFilters";
import InvestmentResults from "./components/InvestmentResults";
import InvestmentStateCard from "./components/InvestmentStateCard";
import useAssetSearch from "./hooks/useAssetSearch";
import useInvestmentSimulation from "./hooks/useInvestmentSimulation";
import "./InvestmentEffectPage.css";

export default function InvestmentEffectPage({ token }) {
  const simulation = useInvestmentSimulation(token);
  const search = useAssetSearch(token);

  const handleSelectAsset = (asset) => {
    simulation.selectAsset(asset);
  };

  return (
    <NavigationPageLayout
      className="investment-page"
      title="투자효과"
      content="소비한 돈을 투자했다면 현재 얼마인지 계산해요."
    >
      <InvestmentFilters
        selectedCategory={simulation.selectedCategory}
        selectedMonth={simulation.selectedMonth}
        onCategoryChange={simulation.setSelectedCategory}
        onMonthChange={simulation.setSelectedMonth}
      />

      <InvestmentStateCard
        errorCode={simulation.errorCode}
        errorDebug={simulation.errorDebug}
        errorMessage={simulation.data ? "" : simulation.errorMessage}
        isLoading={simulation.isLoading && !simulation.data}
      />

      {simulation.data ? (
        <>
          {simulation.isRefreshing ? (
            <div className="investment-refresh-note" role="status">
              <span className="investment-refresh-dot" />
              선택한 종목의 투자효과를 계산하고 있어요.
            </div>
          ) : null}
          {!simulation.isRefreshing && simulation.errorMessage ? (
            <div className="investment-refresh-note is-error" role="alert">
              {simulation.errorMessage}
            </div>
          ) : null}
          <InvestmentResults
            data={simulation.data}
            isRefreshing={simulation.isRefreshing}
            selectedAssets={simulation.selectedAssets}
          >
            <AssetSearchCard {...search} onSelectAsset={handleSelectAsset} />
          </InvestmentResults>
        </>
      ) : null}
    </NavigationPageLayout>
  );
}
