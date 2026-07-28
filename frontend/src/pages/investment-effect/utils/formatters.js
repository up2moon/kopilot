export function formatWon(value) {
  const number = Number(value) || 0
  const sign = number < 0 ? '-' : ''

  return `${sign}${Math.abs(number).toLocaleString('ko-KR')}원`
}

export function formatGain(value) {
  const number = Number(value) || 0
  const sign = number > 0 ? '+' : number < 0 ? '-' : ''

  return `${sign}${Math.abs(number).toLocaleString('ko-KR')}원`
}

export function formatRate(value) {
  const number = Number(value) || 0
  const sign = number > 0 ? '+' : ''

  return `${sign}${(number * 100).toFixed(1)}%`
}

export function formatPrice(value) {
  const number = Number(value) || 0

  return number ? `${number.toLocaleString('ko-KR')}원` : '-'
}

export function getCurrentMonth() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
}

export function getAssetKey(asset) {
  return `${asset.assetType}:${asset.assetCode}`
}
