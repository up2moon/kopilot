async function requestSavingBot(endpoint, token, options = {}) {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    const error = new Error(
      data?.message || "AI 절약 코치 요청을 처리하지 못했습니다.",
    );

    error.code = data?.code || null;
    throw error;
  }

  if (!data) {
    throw new Error("AI 절약 코치가 올바르지 않은 응답을 반환했습니다.");
  }

  return data;
}

export function getSavingBotCoaching(token, signal) {
  return requestSavingBot("/api/users/me/saving-bot/coaching", token, {
    method: "GET",
    signal,
  });
}

export function getSavingBotChatHistory(token, signal) {
  return requestSavingBot("/api/users/me/saving-bot/chat/history", token, {
    method: "GET",
    signal,
  });
}

export function sendSavingBotMessage(token, payload) {
  return requestSavingBot("/api/users/me/saving-bot/chat", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
