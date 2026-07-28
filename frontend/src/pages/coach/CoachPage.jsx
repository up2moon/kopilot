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
  } = useCoachChat(auth?.accessToken, onNavigate);

  const hasSuggestions = suggestions.length > 0;
  const hasVisibleSuggestions = showSuggestions && hasSuggestions;

  return (
    <div className="coach-page">
      <CoachHeader
        coaching={coaching}
        errorMessage={errorMessage}
        isLoading={isLoading}
        onBack={onBack}
      />

      <CoachingInsightCard
        coaching={coaching}
        isLoading={isLoading}
        onRetry={() => loadCoaching()}
      />

      <CoachConversation
        expanded={!hasVisibleSuggestions}
        isSending={isSending}
        loadingMessage={loadingMessage}
        messageListRef={messageListRef}
        messages={messages}
        onMessageAction={handleMessageAction}
      />

      <CoachSuggestions
        isSending={isSending}
        onSelect={selectSuggestion}
        onToggle={toggleSuggestions}
        open={hasVisibleSuggestions}
        suggestions={suggestions}
      />

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
