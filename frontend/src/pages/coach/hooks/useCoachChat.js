import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSavingBotChatHistory,
  getSavingBotCoaching,
  sendSavingBotMessage,
} from "../../../services/savingBot";

export default function useCoachChat(token) {
  const [coaching, setCoaching] = useState(null);
  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [question, setQuestion] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const messageListRef = useRef(null);
  const nextMessageIdRef = useRef(1);

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
          createMessage(message.role, message.content),
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

  const toggleSuggestions = () => {
    setShowSuggestions((current) => !current);
  };

  const selectSuggestion = (suggestion) => {
    setShowSuggestions(false);
    sendQuestion(suggestion);
  };

  return {
    coaching,
    messages,
    suggestions,
    question,
    showSuggestions,
    isLoading,
    isSending,
    errorMessage,
    messageListRef,
    loadCoaching,
    setQuestion,
    toggleSuggestions,
    selectSuggestion,
    sendQuestion,
  };
}
