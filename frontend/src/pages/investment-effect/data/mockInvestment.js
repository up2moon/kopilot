export const useMockInvestment =
  import.meta.env.DEV ||
  import.meta.env.VITE_USE_MOCK_INVESTMENT === 'true'

export const mockInvestmentAssets = [
  { assetCode: '267250', label: 'HD현대중공업', currentPrice: 451000, diffRate: 0.018 },
  { assetCode: '233740', label: 'KB 레버리지 KOSDAQ 150 선물 ETN', currentPrice: 17685, diffRate: -0.012 },
  { assetCode: '035420', label: 'NAVER', currentPrice: 210000, diffRate: 0.006 },
  { assetCode: '034730', label: 'SK', currentPrice: 541000, diffRate: -0.004 },
  { assetCode: '000660', label: 'SK하이닉스', currentPrice: 1550000, diffRate: 0.021 },
  { assetCode: '001680', label: '대상', currentPrice: 3835, diffRate: -0.008 },
  { assetCode: '003490', label: '대한항공', currentPrice: 25250, diffRate: 0.003 },
  { assetCode: '520009', label: '미래에셋 레버리지 삼성전자 ETN', currentPrice: 8915, diffRate: -0.015 },
  { assetCode: '442580', label: '삼성 iSelect 조선 TOP10 ETN', currentPrice: 11070, diffRate: 0.009 },
  { assetCode: '461450', label: '삼성 KRX 2차전지 TOP10 ETN', currentPrice: 10560, diffRate: 0.017 },
  { assetCode: '005930', label: '삼성전자', currentPrice: 220000, diffRate: -0.005 },
  { assetCode: '005935', label: '삼성전자우', currentPrice: 158200, diffRate: 0.004 },
  { assetCode: '360750', label: 'TIGER 미국S&P500', currentPrice: 23850, diffRate: 0.007 },
  { assetCode: '069500', label: 'KODEX 200', currentPrice: 49250, diffRate: -0.002 },
  { assetCode: '373220', label: 'LG에너지솔루션', currentPrice: 388500, diffRate: 0.011 },
  { assetCode: '207940', label: '삼성바이오로직스', currentPrice: 1048000, diffRate: -0.006 },
  { assetCode: '012450', label: '한화에어로스페이스', currentPrice: 836000, diffRate: 0.026 },
  { assetCode: '105560', label: 'KB금융', currentPrice: 112500, diffRate: -0.003 },
  { assetCode: '055550', label: '신한지주', currentPrice: 62800, diffRate: 0.005 },
  { assetCode: '035720', label: '카카오', currentPrice: 59400, diffRate: -0.009 },
].map((asset) => ({
  ...asset,
  assetType: asset.label.includes('ETN') ? 'ETN' : 'STOCK',
  market: 'KOSPI',
}))

const categoryAmounts = {
  savings: 48000,
  coffee: 68400,
  food: 286500,
  delivery: 124000,
  transport: 97300,
  shopping: 342000,
  subscription: 45900,
  all: 1276400,
}

const categoryLabels = {
  savings: '절약액',
  coffee: '카페·간식',
  food: '식비',
  delivery: '배달',
  transport: '교통',
  shopping: '쇼핑',
  subscription: '구독',
  all: '전체',
}

function getAssumedBuyDate(month) {
  const date = new Date(`${month}-01T00:00:00`)

  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1)
  }

  return `${month}-${String(date.getDate()).padStart(2, '0')}`
}

function createMarketResult(asset, amount, returnRate, assumedBuyDate) {
  const currentPrice = Number(asset.currentPrice)
  const basePrice = Math.round(currentPrice / (1 + returnRate))
  const estimatedValue = Math.round(amount * (1 + returnRate))

  return {
    ...asset,
    assumedBuyDate,
    baseTradeDate: assumedBuyDate,
    basePrice,
    currentTradeDate: '2026-07-29',
    currentPrice,
    returnRate,
    estimatedValue,
    estimatedGain: estimatedValue - amount,
    source: 'FRONTEND_DEMO',
  }
}

export function createMockInvestmentSimulation({
  month,
  category,
  selectedAssets,
}) {
  const amount = categoryAmounts[category] || categoryAmounts.coffee
  const categoryLabel = categoryLabels[category] || categoryLabels.coffee
  const assumedBuyDate = getAssumedBuyDate(month)
  const monthLabel = `${Number(month.slice(5, 7))}월`
  const benchmarkAssets = [
    {
      assetCode: '360750',
      label: 'S&P500 ETF',
      icon: '📈',
      description: 'TIGER 미국S&P500',
      currentPrice: 23850,
    },
    {
      assetCode: '069500',
      label: 'KOSPI 200 ETF',
      icon: '🇰🇷',
      description: 'KODEX 200',
      currentPrice: 49250,
    },
  ]
  const benchmarks = [
    createMarketResult(benchmarkAssets[0], amount, 0.084, assumedBuyDate),
    createMarketResult(benchmarkAssets[1], amount, -0.021, assumedBuyDate),
    {
      assetCode: 'TERM_DEPOSIT',
      label: '정기예금/CMA',
      icon: '🏦',
      description: '연 3.2% 가정',
      assumedBuyDate,
      returnRate: 0.002,
      estimatedValue: Math.round(amount * 1.002),
      estimatedGain: Math.round(amount * 0.002),
      source: 'FRONTEND_DEMO',
    },
  ]
  const comparisons = selectedAssets.map((asset, index) =>
    createMarketResult(
      asset,
      amount,
      index % 2 === 0 ? 0.047 : -0.018,
      assumedBuyDate,
    ),
  )
  const isSavings = category === 'savings'

  return {
    month,
    category,
    categoryLabel,
    spendingAmount: isSavings ? 0 : amount,
    investmentAmount: amount,
    savedAmount: isSavings ? amount : 0,
    assumedBuyDate,
    summaryText: isSavings
      ? `${monthLabel} 챌린지로 만든 예상 절약액 ${amount.toLocaleString('ko-KR')}원을 기준으로 계산했어요.`
      : `${monthLabel} ${categoryLabel} 소비액 ${amount.toLocaleString('ko-KR')}원을 기준으로 계산했어요.`,
    assumptionText: isSavings
      ? `이 절약액을 ${monthLabel} 첫 거래일에 투자했다면 현재 얼마인지 계산했어요.`
      : `'${monthLabel}에 쓴 돈을 ${monthLabel} 첫 거래일에 투자했다면'으로 계산했어요.`,
    benchmarks,
    comparisons,
    status: 'OK',
    disclaimer: '로컬 개발용 더미데이터이며 투자 권유가 아닌 참고용 시뮬레이션입니다.',
  }
}
