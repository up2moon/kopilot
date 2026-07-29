import CoachConversation from "./components/CoachConversation";
import CoachHeader from "./components/CoachHeader";
import CoachInputForm from "./components/CoachInputForm";
import CoachSuggestions from "./components/CoachSuggestions";
import CoachingInsightCard from "./components/CoachingInsightCard";
import useCoachChat from "./hooks/useCoachChat";
import "./CoachPage.css";

export default function CoachPage({ auth, onBack, onNavigate }) {
  const {
    coaching,
    messages,
    suggestions,
    question,
    showSuggestions,
    isLoading,
    isSending,
    loadingMessage,
    errorMessage,
    messageListRef,
    loadCoaching,
    setQuestion,
    toggleSuggestions,
    selectSuggestion,
    sendQuestion,
    handleMessageAction,
    investmentContext,
    isInvestmentMode,
  } = useCoachChat(auth?.accessToken, onNavigate);

  const hasSuggestions = suggestions.length > 0;
  const hasVisibleSuggestions = showSuggestions && hasSuggestions;

  return (
    <div className="coach-page">
      <CoachHeader
        coaching={coaching}
        errorMessage={errorMessage}
        isLoading={isLoading || isSending}
        onBack={onBack}
        title={isInvestmentMode ? "AI 종목 분석" : "AI 절약 챗봇"}
      />

      {isInvestmentMode ? (
        <section className="coach-investment-context">
          <span>선택 종목</span>
          <strong>{investmentContext?.assetName}</strong>
          <p>
            월 절약액{" "}
            {Number(investmentContext?.monthlyAmount || 0).toLocaleString(
              "ko-KR",
            )}
            원을 기준으로 균형 있게 살펴봐요.
          </p>
        </section>
      ) : (
        <CoachingInsightCard
          coaching={coaching}
          isLoading={isLoading}
          onRetry={() => loadCoaching()}
        />
      )}

      <CoachConversation
        expanded={!hasVisibleSuggestions}
        isSending={isSending && !isInvestmentMode}
        loadingMessage={loadingMessage}
        messageListRef={messageListRef}
        messages={messages}
        onMessageAction={handleMessageAction}
      />

      {!isInvestmentMode ? (
        <CoachSuggestions
          isSending={isSending}
          onSelect={selectSuggestion}
          onToggle={toggleSuggestions}
          open={hasVisibleSuggestions}
          suggestions={suggestions}
        />
      ) : null}

      {errorMessage ? (
        <p className="coach-error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <CoachInputForm
        disabled={isLoading || !coaching || isSending}
        onChange={setQuestion}
        onSubmit={sendQuestion}
        question={question}
      />
    </div>
  );
}
