import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSavingBotCoaching,
  sendSavingBotMessage,
} from "../services/savingBot";
import "./CoachPage.css";

const suggestionTones = ["blue", "green", "neutral"];

export default function CoachPage({ auth, onBack }) {
  const [coaching, setCoaching] = useState(null);
  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [question, setQuestion] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const messageListRef = useRef(null);
  const nextMessageIdRef = useRef(1);
  const token = auth?.accessToken;

  const createMessage = useCallback((role, text) => {
    const message = {
      id: nextMessageIdRef.current,
      role,
      text,
    };

    nextMessageIdRef.current += 1;

    return message;
  }, []);

  const loadCoaching = useCallback(
    async (signal) => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const data = await getSavingBotCoaching(token, signal);

        setCoaching(data);
        setSuggestions(data.suggestedQuestions || []);
        setMessages((current) =>
          current.length || !data.greeting
            ? current
            : [createMessage("assistant", data.greeting)],
        );
      } catch (error) {
        if (error.name !== "AbortError") {
          setErrorMessage(error.message);
        }
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [createMessage, token],
  );

  useEffect(() => {
    const controller = new AbortController();

    loadCoaching(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadCoaching]);

  useEffect(() => {
    const messageList = messageListRef.current;

    if (messageList) {
      messageList.scrollTo({
        top: messageList.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isSending]);

  const sendQuestion = async (nextQuestion) => {
    const trimmedQuestion = nextQuestion.trim();

    if (!trimmedQuestion || isSending) {
      return;
    }

    const recentMessages = messages.slice(-8).map((message) => ({
      role: message.role,
      content: message.text,
    }));

    setMessages((current) => [
      ...current,
      createMessage("user", trimmedQuestion),
    ]);
    setQuestion("");
    setErrorMessage("");
    setIsSending(true);

    try {
      const data = await sendSavingBotMessage(token, {
        message: trimmedQuestion,
        recentMessages,
      });

      setMessages((current) => [
        ...current,
        createMessage("assistant", data.answer),
      ]);
      setSuggestions(
        (data.suggestedQuestions || []).map((suggestion, index) =>
          typeof suggestion === "string"
            ? {
                id: `response-suggestion-${index + 1}`,
                label: suggestion,
              }
            : suggestion,
        ),
      );
      setShowSuggestions(true);
    } catch (error) {
      setErrorMessage(error.message);
      setMessages((current) => [
        ...current,
        createMessage(
          "assistant",
          "답변을 불러오지 못했어요. 잠시 후 다시 질문해주세요.",
        ),
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendQuestion(question);
  };

  const statusLabel = isLoading
    ? "분석 중"
    : errorMessage && !coaching
      ? "연결 오류"
      : coaching?.status === "INSUFFICIENT_DATA"
        ? "데이터 부족"
        : "분석 완료";
  const hasVisibleSuggestions = showSuggestions && suggestions.length > 0;

  return (
    <div className="coach-page">
      <header className="coach-header">
        <button
          className="coach-back-button"
          type="button"
          onClick={onBack}
          aria-label="대시보드로 돌아가기"
        >
          &lt;
        </button>
        <h1>AI 절약 챗봇</h1>
        <span
          className={`coach-status coach-status-${
            isLoading
              ? "loading"
              : errorMessage && !coaching
                ? "error"
                : coaching?.status === "INSUFFICIENT_DATA"
                  ? "insufficient"
                  : "completed"
          }`}
        >
          {statusLabel}
        </span>
      </header>

      <section className="coach-insight-card" aria-labelledby="today-coaching">
        <span id="today-coaching">오늘의 코칭</span>
        <strong>
          {isLoading
            ? "소비 데이터를 분석하고 있어요."
            : coaching?.coaching?.message || "오늘의 코칭을 불러오지 못했어요."}
        </strong>
        {!isLoading && !coaching ? (
          <button type="button" onClick={() => loadCoaching()}>
            다시 불러오기
          </button>
        ) : null}
      </section>

      <main
        className={`coach-conversation${
          hasVisibleSuggestions ? "" : " is-expanded"
        }`}
        aria-live="polite"
      >
        <p className="coach-date">오늘</p>
        <div className="coach-message-list" ref={messageListRef}>
          {messages.map((message) => (
            <p
              className={`coach-message coach-message-${message.role}`}
              key={message.id}
            >
              {message.text}
            </p>
          ))}
          {isSending ? (
            <p className="coach-message coach-message-assistant coach-message-loading">
              답변을 생각하고 있어요…
            </p>
          ) : null}
        </div>
      </main>

      {hasVisibleSuggestions ? (
        <section
          className="coach-suggestions"
          aria-labelledby="suggestion-title"
        >
          <div className="coach-suggestion-header">
            <h2 id="suggestion-title">추천 질문</h2>
            <button
              className="coach-suggestion-close"
              type="button"
              onClick={() => setShowSuggestions(false)}
              aria-label="추천 질문 닫기"
            >
              ×
            </button>
          </div>
          <div className="coach-suggestion-list">
            {suggestions.map((suggestion, index) => (
              <button
                className={`coach-suggestion coach-suggestion-${
                  suggestionTones[index % suggestionTones.length]
                }`}
                type="button"
                key={suggestion.id || suggestion.label}
                onClick={() => sendQuestion(suggestion.label)}
                disabled={isSending}
              >
                {suggestion.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {errorMessage ? (
        <p className="coach-error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <form className="coach-input-form" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="coach-question">
          AI 코치에게 질문하기
        </label>
        <input
          id="coach-question"
          type="text"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="AI 코치에게 물어보기"
          maxLength={1000}
          disabled={isLoading || !coaching || isSending}
        />
        <button
          type="submit"
          aria-label="질문 보내기"
          disabled={!question.trim() || isLoading || !coaching || isSending}
        >
          &gt;
        </button>
      </form>

      <p className="coach-disclaimer">
        AI 코칭은 참고용이며 투자 권유가 아닙니다.
      </p>
    </div>
  );
}
