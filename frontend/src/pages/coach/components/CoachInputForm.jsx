import sendIcon from "../../../assets/icons/send.svg";

export default function CoachInputForm({
  disabled,
  onChange,
  onSubmit,
  question,
}) {
  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(question);
  };

  return (
    <form className="coach-input-form" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="coach-question">
        AI 코치에게 질문하기
      </label>
      <input
        id="coach-question"
        type="text"
        value={question}
        onChange={(event) => onChange(event.target.value)}
        placeholder="AI 코치에게 물어보기"
        maxLength={1000}
        disabled={disabled}
      />
      <button
        type="submit"
        aria-label="질문 보내기"
        disabled={!question.trim() || disabled}
      >
        <img src={sendIcon} alt="" aria-hidden="true" />
      </button>
    </form>
  );
}
