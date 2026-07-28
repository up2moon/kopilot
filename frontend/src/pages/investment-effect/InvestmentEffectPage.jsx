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
    search.clearSearch();
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
        errorMessage={simulation.errorMessage}
        isLoading={simulation.isLoading}
      />

      {!simulation.isLoading && !simulation.errorMessage ? (
        <>
          <InvestmentResults
            data={simulation.data}
            selectedAssets={simulation.selectedAssets}
          >
            <AssetSearchCard {...search} onSelectAsset={handleSelectAsset} />
          </InvestmentResults>
        </>
      ) : null}
    </NavigationPageLayout>
  );
}
