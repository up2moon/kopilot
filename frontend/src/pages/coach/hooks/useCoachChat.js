import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSavingBotChatHistory,
  getSavingBotCoaching,
  sendSavingBotMessage,
  streamInvestmentAnalysis,
} from "../../../services/savingBot";

const CREATE_WEEKLY_CHALLENGE_ACTION = "CREATE_WEEKLY_CHALLENGE";
const CHALLENGE_PATH = "/challenge";
const CHALLENGE_HIGHLIGHT_STORAGE_KEY = "kopilot:new-challenge-highlight";

function getInvestmentContext() {
  const query = new URLSearchParams(window.location.search);

  if (query.get("mode") !== "investment") {
    return null;
  }

  const assetCode = query.get("assetCode")?.trim() || "";
  const assetName = query.get("assetName")?.trim() || assetCode;
  const month = query.get("month") || "";
  const monthlyAmount = Math.round(Number(query.get("amount")));

  if (
    !assetCode ||
    !Number.isFinite(monthlyAmount) ||
    monthlyAmount <= 0
  ) {
    return null;
  }

  return {
    assetCode,
    assetName,
    month: /^\d{4}-\d{2}$/.test(month) ? month : null,
    monthlyAmount,
  };
}

export default function useCoachChat(token, onNavigate) {
  const [coaching, setCoaching] = useState(null);
  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [question, setQuestion] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [requestedAction, setRequestedAction] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const messageListRef = useRef(null);
  const nextMessageIdRef = useRef(1);
  const investmentContextRef = useRef(getInvestmentContext());
  const autoAnalysisStartedRef = useRef(false);
  const sendQuestionRef = useRef(null);
  const investmentContext = investmentContextRef.current;
  const isInvestmentMode = Boolean(investmentContext);

  const createMessage = useCallback(
    (
      role,
      text,
      action = null,
      analysis = null,
      analysisProgress = null,
    ) => {
      const message = {
        id: nextMessageIdRef.current,
        role,
        text,
        action,
        analysis,
        analysisProgress,
      };

      nextMessageIdRef.current += 1;

      return message;
    },
    [],
  );

  const isSafeClientAction = useCallback(
    (action) =>
      action?.type === "NAVIGATE" &&
      action?.path === CHALLENGE_PATH &&
      (
        action.highlightChallengeId === undefined
        || (
          Number.isInteger(Number(action.highlightChallengeId))
          && Number(action.highlightChallengeId) > 0
        )
      ) &&
      typeof onNavigate === "function",
    [onNavigate],
  );

  const rememberChallengeHighlight = useCallback((action) => {
    if (!action?.highlightChallengeId) {
      return;
    }

    try {
      window.sessionStorage.setItem(
        CHALLENGE_HIGHLIGHT_STORAGE_KEY,
        JSON.stringify({
          challengeId: Number(action.highlightChallengeId),
          expiresAt: Date.now() + 60_000,
        }),
      );
    } catch {
      // 저장소 접근이 제한되어도 화면 이동 자체는 유지한다.
    }
  }, []);

  const handleMessageAction = useCallback(
    (action) => {
      if (!isSafeClientAction(action)) {
        return;
      }

      rememberChallengeHighlight(action);
      onNavigate(action.path);
    },
    [
      isSafeClientAction,
      onNavigate,
      rememberChallengeHighlight,
    ],
  );

  const loadCoaching = useCallback(
    async (signal) => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [data, historyResult] = await Promise.all([
          getSavingBotCoaching(token, signal),
          getSavingBotChatHistory(token, signal).catch((error) => {
            if (error.name === "AbortError") {
              throw error;
            }

            return { messages: [] };
          }),
        ]);
        const savedMessages = isInvestmentMode
          ? []
          : (historyResult.messages || []).map((message) =>
              createMessage(message.role, message.content),
            );

        setCoaching(data);
        setSuggestions(data.suggestedQuestions || []);
        setMessages((current) =>
          current.length
            ? current
            : isInvestmentMode
              ? []
            : savedMessages.length
              ? savedMessages
              : data.greeting
                ? [createMessage("assistant", data.greeting)]
                : [],
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
    [createMessage, isInvestmentMode, token],
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

  const sendQuestion = async (nextQuestion, nextRequestedAction = null) => {
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
    setRequestedAction(nextRequestedAction);
    let investmentProgressMessageId = null;

    try {
      if (isInvestmentMode) {
        const progressMessage = createMessage(
          "assistant",
          "",
          null,
          null,
          {
            message: "분석 요청을 준비하고 있어요.",
            stages: {
              information: "running",
              risk: "waiting",
              opportunity: "waiting",
              report: "waiting",
            },
            information: null,
            perspectives: {
              risk: null,
              opportunity: null,
            },
            streamPreviews: {
              risk: "",
              opportunity: "",
            },
          },
        );
        investmentProgressMessageId = progressMessage.id;

        setMessages((current) => [...current, progressMessage]);

        await streamInvestmentAnalysis(
          token,
          {
            ...investmentContext,
            question: trimmedQuestion,
          },
          (event) => {
            setMessages((current) =>
              current.map((message) => {
                if (message.id !== progressMessage.id) {
                  return message;
                }

                if (event.type === "analysis.completed") {
                  return {
                    ...message,
                    text: event.answer,
                    analysis: event.analysis,
                    analysisProgress: null,
                  };
                }

                const progress = message.analysisProgress;

                if (!progress) return message;

                const nextProgress = {
                  ...progress,
                  message: event.message || progress.message,
                  stages: {
                    ...progress.stages,
                  },
                  perspectives: {
                    ...progress.perspectives,
                  },
                  streamPreviews: {
                    ...progress.streamPreviews,
                  },
                };

                if (event.type === "information.completed") {
                  nextProgress.stages.information = "completed";
                  nextProgress.information = event.result;
                } else if (event.type === "perspectives.started") {
                  nextProgress.stages.risk = "running";
                  nextProgress.stages.opportunity = "running";
                } else if (event.type === "perspective.completed") {
                  const key =
                    event.agent === "risk_agent"
                      ? "risk"
                      : "opportunity";
                  nextProgress.stages[key] = "completed";
                  nextProgress.perspectives[key] = event.result;
                  nextProgress.streamPreviews[key] = "";
                } else if (event.type === "perspective.delta") {
                  const key =
                    event.agent === "risk_agent"
                      ? "risk"
                      : "opportunity";
                  nextProgress.streamPreviews[key] = event.preview || "";
                } else if (event.type === "report.started") {
                  nextProgress.stages.report = "running";
                }

                return {
                  ...message,
                  analysisProgress: nextProgress,
                };
              }),
            );
          },
        );

        return;
      }

      const payload = {
        message: trimmedQuestion,
        recentMessages,
      };

      if (nextRequestedAction === CREATE_WEEKLY_CHALLENGE_ACTION) {
        payload.requestedAction = nextRequestedAction;
      }

      const data = await sendSavingBotMessage(token, payload);
      const clientAction = isSafeClientAction(data.clientAction)
        ? {
            ...data.clientAction,
            label: "챌린지 보기",
          }
        : null;

      setMessages((current) => [
        ...current,
        createMessage(
          "assistant",
          data.answer,
          clientAction,
          data.investmentAnalysis || null,
        ),
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
      setMessages((current) => {
        if (investmentProgressMessageId) {
          return current.map((message) =>
            message.id === investmentProgressMessageId
              ? {
                  ...message,
                  text:
                    error.message ||
                    "종목 분석을 불러오지 못했어요. 잠시 후 다시 시도해주세요.",
                  analysisProgress: null,
                }
              : message,
          );
        }

        return [
          ...current,
          createMessage(
            "assistant",
            "답변을 불러오지 못했어요. 잠시 후 다시 질문해주세요.",
          ),
        ];
      });
    } finally {
      setIsSending(false);
      setRequestedAction(null);
    }
  };
  sendQuestionRef.current = sendQuestion;

  useEffect(() => {
    if (
      !isInvestmentMode ||
      isLoading ||
      isSending ||
      autoAnalysisStartedRef.current
    ) {
      return;
    }

    autoAnalysisStartedRef.current = true;
    sendQuestionRef.current?.(
      `${investmentContext.assetName} 종목을 분석해줘`,
    );
  }, [isInvestmentMode, isLoading, isSending, investmentContext]);

  const toggleSuggestions = () => {
    setShowSuggestions((current) => !current);
  };

  const selectSuggestion = (suggestion) => {
    const normalizedSuggestion =
      typeof suggestion === "string"
        ? { label: suggestion, action: "ASK" }
        : suggestion;

    setShowSuggestions(false);
    sendQuestion(
      normalizedSuggestion.label,
      normalizedSuggestion.action === CREATE_WEEKLY_CHALLENGE_ACTION
        ? CREATE_WEEKLY_CHALLENGE_ACTION
        : null,
    );
  };

  const loadingMessage =
    isInvestmentMode
      ? "시세와 뉴스를 모으고 찬반 관점을 분석하고 있어요…"
      : requestedAction === CREATE_WEEKLY_CHALLENGE_ACTION
      ? "이번 주 소비를 살펴보고 미션을 만들고 있어요…"
      : "답변을 생각하고 있어요…";

  return {
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
  };
}
