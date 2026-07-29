import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSavingBotChatHistory,
  getSavingBotCoaching,
  sendSavingBotMessage,
} from "../../../services/savingBot";

const CREATE_WEEKLY_CHALLENGE_ACTION = "CREATE_WEEKLY_CHALLENGE";
const ANALYZE_ASSET_ALLOCATION_ACTION = "ANALYZE_ASSET_ALLOCATION";
const ASSET_ALLOCATION_QUESTION = "소비 패턴으로 자산 배분 받기";
const CHALLENGE_PATH = "/challenge";
const CHALLENGE_HIGHLIGHT_STORAGE_KEY = "kopilot:new-challenge-highlight";

function isAssetAllocationQuestion(value) {
  return /(소비\s*패턴).*(자산\s*배분)/.test(String(value || ""));
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
  const [showAllocationAmountForm, setShowAllocationAmountForm] =
    useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const messageListRef = useRef(null);
  const nextMessageIdRef = useRef(1);

  const createMessage = useCallback((
    role,
    text,
    action = null,
    assetAllocation = null,
  ) => {
    const message = {
      id: nextMessageIdRef.current,
      role,
      text,
      action,
      assetAllocation,
    };

    nextMessageIdRef.current += 1;

    return message;
  }, []);

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
        const savedMessages = (historyResult.messages || []).map((message) =>
          createMessage(
            message.role,
            message.content,
            null,
            message.assetAllocation || null,
          ),
        );

        setCoaching(data);
        setSuggestions(data.suggestedQuestions || []);
        setMessages((current) =>
          current.length
            ? current
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

  const sendQuestion = async (
    nextQuestion,
    nextRequestedAction = null,
    options = {},
  ) => {
    const trimmedQuestion = nextQuestion.trim();

    if (!trimmedQuestion || isSending) {
      return;
    }

    if (
      isAssetAllocationQuestion(trimmedQuestion) &&
      nextRequestedAction !== ANALYZE_ASSET_ALLOCATION_ACTION
    ) {
      setQuestion("");
      setShowSuggestions(false);
      setShowAllocationAmountForm(true);
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

    try {
      const payload = {
        message: trimmedQuestion,
        recentMessages,
      };

      if (
        [
          CREATE_WEEKLY_CHALLENGE_ACTION,
          ANALYZE_ASSET_ALLOCATION_ACTION,
        ].includes(nextRequestedAction)
      ) {
        payload.requestedAction = nextRequestedAction;
      }
      if (nextRequestedAction === ANALYZE_ASSET_ALLOCATION_ACTION) {
        payload.allocationBaseAmount = options.allocationBaseAmount;
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
          data.assetAllocation || null,
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
      if (error.code === "ALLOCATION_AMOUNT_REQUIRED") {
        setShowAllocationAmountForm(true);
        setMessages((current) => current.slice(0, -1));
        return;
      }

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
      setRequestedAction(null);
    }
  };

  const toggleSuggestions = () => {
    setShowSuggestions((current) => !current);
  };

  const selectSuggestion = (suggestion) => {
    const normalizedSuggestion =
      typeof suggestion === "string"
        ? { label: suggestion, action: "ASK" }
        : suggestion;
    const inferredAction = isAssetAllocationQuestion(
      normalizedSuggestion.label,
    )
      ? ANALYZE_ASSET_ALLOCATION_ACTION
      : normalizedSuggestion.action;

    setShowSuggestions(false);
    if (
      inferredAction === ANALYZE_ASSET_ALLOCATION_ACTION
    ) {
      setShowAllocationAmountForm(true);
      return;
    }

    sendQuestion(
      normalizedSuggestion.label,
      [
        CREATE_WEEKLY_CHALLENGE_ACTION,
        ANALYZE_ASSET_ALLOCATION_ACTION,
      ].includes(inferredAction)
        ? inferredAction
        : null,
    );
  };

  const submitAllocationAmount = (allocationBaseAmount) => {
    setShowAllocationAmountForm(false);
    sendQuestion(
      ASSET_ALLOCATION_QUESTION,
      ANALYZE_ASSET_ALLOCATION_ACTION,
      { allocationBaseAmount },
    );
  };

  const loadingMessage =
    requestedAction === CREATE_WEEKLY_CHALLENGE_ACTION
      ? "이번 주 소비를 살펴보고 미션을 만들고 있어요…"
      : requestedAction === ANALYZE_ASSET_ALLOCATION_ACTION
        ? "소비 패턴을 분석해 자산 배분안을 만들고 있어요…"
      : "답변을 생각하고 있어요…";

  return {
    coaching,
    messages,
    suggestions,
    question,
    showSuggestions,
    showAllocationAmountForm,
    isLoading,
    isSending,
    loadingMessage,
    errorMessage,
    messageListRef,
    loadCoaching,
    setQuestion,
    toggleSuggestions,
    selectSuggestion,
    setShowAllocationAmountForm,
    submitAllocationAmount,
    sendQuestion,
    handleMessageAction,
  };
}
