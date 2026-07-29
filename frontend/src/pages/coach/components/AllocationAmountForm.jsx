import { useState } from "react";

export default function AllocationAmountForm({
  disabled,
  onCancel,
  onSubmit,
}) {
  const [amount, setAmount] = useState("");
  const numericAmount = Number(amount.replaceAll(",", ""));
  const isValid =
    Number.isInteger(numericAmount) &&
    numericAmount >= 10000 &&
    numericAmount <= 1000000000;

  const handleChange = (event) => {
    const digits = event.target.value.replace(/\D/g, "").slice(0, 10);
    setAmount(digits ? Number(digits).toLocaleString("ko-KR") : "");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isValid) onSubmit(numericAmount);
  };

  return (
    <form className="coach-allocation-amount-form" onSubmit={handleSubmit}>
      <label htmlFor="allocation-base-amount">얼마를 배분할까요?</label>
      <div>
        <input
          id="allocation-base-amount"
          inputMode="numeric"
          value={amount}
          onChange={handleChange}
          placeholder="예: 1,000,000"
          autoFocus
          disabled={disabled}
        />
        <span>원</span>
      </div>
      <p>ETF는 최신 저장 종가 기준으로 1주 단위로 계산해요.</p>
      <div className="coach-allocation-amount-actions">
        <button type="button" onClick={onCancel} disabled={disabled}>
          취소
        </button>
        <button type="submit" disabled={disabled || !isValid}>
          배분하기
        </button>
      </div>
    </form>
  );
}
