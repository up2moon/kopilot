export function formatCurrency(amount) {
  return `${(amount || 0).toLocaleString('ko-KR')}원`
}

export function formatPoints(points) {
  return `${(points || 0).toLocaleString('ko-KR')} pt`
}
