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
    throw new Error(
      data?.message || "AI 절약 코치 요청을 처리하지 못했습니다.",
    );
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

export function sendInvestmentAnalysis(token, payload) {
  return requestSavingBot(
    "/api/users/me/saving-bot/investment-analysis",
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function streamInvestmentAnalysis(token, payload, onEvent) {
  const response = await fetch(
    "/api/users/me/saving-bot/investment-analysis/stream",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(
      data?.message || "AI 종목 분석 요청을 처리하지 못했습니다.",
    );
  }

  if (!response.body) {
    throw new Error("AI 종목 분석 스트림을 열지 못했습니다.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), {
      stream: !done,
    });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() || "";

    for (const block of blocks) {
      const dataText = block
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");

      if (!dataText) continue;

      const event = JSON.parse(dataText);
      onEvent?.(event);

      if (event.type === "analysis.error") {
        throw new Error(event.message || "AI 종목 분석에 실패했습니다.");
      }
    }

    if (done) break;
  }
}
