export default function formatWon(value) {
  return `${Math.max(0, Number(value) || 0).toLocaleString('ko-KR')}원`
}
