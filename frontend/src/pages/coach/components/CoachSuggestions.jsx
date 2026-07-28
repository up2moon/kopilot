import arrowDownIcon from "../../../assets/icons/arrow-down.svg";

const suggestionTones = ["blue", "green", "neutral"];

export default function CoachSuggestions({
  isSending,
  onSelect,
  onToggle,
  open,
  suggestions,
}) {
  if (!suggestions.length) {
    return null;
  }

  return (
    <section
      className={`coach-suggestions${open ? " is-open" : " is-collapsed"}`}
      aria-labelledby="suggestion-title"
    >
      <button
        className="coach-suggestion-toggle"
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="coach-suggestion-list"
      >
        <span className="coach-suggestion-title" id="suggestion-title">
          <span className="coach-suggestion-spark" aria-hidden="true">
            ✦
          </span>
          추천 질문
          {!open ? ` 보기 (${suggestions.length})` : ""}
        </span>
        <img
          className="coach-suggestion-chevron"
          src={arrowDownIcon}
          alt=""
          aria-hidden="true"
        />
      </button>
      <div
        className={`coach-suggestion-list-shell${open ? " is-open" : ""}`}
        aria-hidden={!open}
      >
        <div className="coach-suggestion-list" id="coach-suggestion-list">
          {suggestions.map((suggestion, index) => (
            <button
              className={`coach-suggestion coach-suggestion-${
                suggestionTones[index % suggestionTones.length]
              }`}
              type="button"
              key={suggestion.id || suggestion.label}
              onClick={() => onSelect(suggestion)}
              disabled={isSending || !open}
              tabIndex={open ? 0 : -1}
            >
              {suggestion.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
