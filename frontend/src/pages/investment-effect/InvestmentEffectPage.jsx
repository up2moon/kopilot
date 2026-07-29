import { useEffect, useRef } from "react";
import NavigationPageLayout from "../../components/NavigationPageLayout";
import AssetSearchCard from "./components/AssetSearchCard";
import InvestmentFilters from "./components/InvestmentFilters";
import InvestmentResults from "./components/InvestmentResults";
import InvestmentStateCard from "./components/InvestmentStateCard";
import useAssetSearch from "./hooks/useAssetSearch";
import useInvestmentSimulation from "./hooks/useInvestmentSimulation";
import "./InvestmentEffectPage.css";

export default function InvestmentEffectPage({ onNavigate, token }) {
  const simulation = useInvestmentSimulation(token);
  const search = useAssetSearch(token);
  const selectedResultRef = useRef(null);
  const pendingScrollAssetCodeRef = useRef(null);

  const handleSelectAsset = (asset) => {
    if (simulation.selectedAssets[0]?.assetCode === asset.assetCode) {
      selectedResultRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
      return;
    }

    pendingScrollAssetCodeRef.current = asset.assetCode;
    simulation.selectAsset(asset);
  };

  useEffect(() => {
    const pendingAssetCode = pendingScrollAssetCodeRef.current;
    const resultIsReady = simulation.data?.comparisons?.some(
      (comparison) => comparison.assetCode === pendingAssetCode,
    );

    if (!pendingAssetCode || simulation.isRefreshing || !resultIsReady) return;

    pendingScrollAssetCodeRef.current = null;
    window.requestAnimationFrame(() => {
      selectedResultRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    });
  }, [simulation.data, simulation.isRefreshing]);

  return (
    <NavigationPageLayout
      className="investment-page"
      title="투자효과"
      content={
        simulation.selectedCategory === "savings"
          ? "챌린지로 아낀 돈의 미래 가치를 계산해요."
          : "소비한 돈을 투자했다면 현재 얼마인지 계산해요."
      }
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
            onOpenChallenges={() => onNavigate("/challenge")}
            selectedAssets={simulation.selectedAssets}
            selectedResultRef={selectedResultRef}
          >
            <AssetSearchCard
              {...search}
              onSelectAsset={handleSelectAsset}
              selectedAssetCode={simulation.selectedAssets[0]?.assetCode}
            />
          </InvestmentResults>
        </>
      ) : null}
    </NavigationPageLayout>
  );
}
