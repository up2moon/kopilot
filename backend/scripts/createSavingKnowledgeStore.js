import "../src/config/env.js";

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiKey = process.env.OPEN_AI_KEY;

if (!apiKey) {
  throw new Error("OPEN_AI_KEY is required");
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const knowledgeDirectory = path.resolve(
  scriptDirectory,
  "../knowledge/saving",
);
const categoryByFilename = {
  "common.md": "common",
  "cafe.md": "cafe",
  "delivery.md": "delivery",
  "subscription.md": "subscription",
  "shopping.md": "shopping",
  "dining.md": "dining",
  "culture.md": "culture",
  "budget.md": "budget",
};

async function openAIRequest(url, options = {}) {
  const requestTimeoutMs = 60000;
  const response = await fetch(`https://api.openai.com/v1${url}`, {
    ...options,
    signal: options.signal || AbortSignal.timeout(requestTimeoutMs),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `${options.method || "GET"} ${url} failed: ${response.status} ${body}`,
    );
  }

  return response.json();
}

async function uploadFile(filename) {
  const bytes = await readFile(path.join(knowledgeDirectory, filename));
  const formData = new FormData();

  formData.append(
    "file",
    new Blob([bytes], {
      type: "text/markdown",
    }),
    filename,
  );
  formData.append("purpose", "assistants");

  return openAIRequest("/files", {
    method: "POST",
    body: formData,
  });
}

async function waitUntilReady(vectorStoreId, expectedCount) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const result = await openAIRequest(
      `/vector_stores/${vectorStoreId}/files?limit=100`,
    );
    const completed = result.data.filter(
      (file) => file.status === "completed",
    ).length;
    const failed = result.data.filter((file) => file.status === "failed");

    console.log(
      `[인덱싱] ${completed}/${expectedCount}개 완료 (${attempt + 1}/60)`,
    );

    if (failed.length) {
      throw new Error(
        `Vector Store file processing failed: ${JSON.stringify(failed)}`,
      );
    }

    if (completed >= expectedCount) {
      return;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
  }

  throw new Error("Timed out waiting for Vector Store files");
}

const filenames = (await readdir(knowledgeDirectory))
  .filter((filename) => filename.endsWith(".md"))
  .sort();

if (!filenames.length) {
  throw new Error("No saving knowledge documents found");
}

const unknownFilenames = filenames.filter(
  (filename) => !categoryByFilename[filename],
);

if (unknownFilenames.length) {
  throw new Error(
    `Unknown saving knowledge documents: ${unknownFilenames.join(", ")}`,
  );
}

console.log(`[시작] 절약 지식 문서 ${filenames.length}개를 확인했습니다.`);
console.log("[생성] OpenAI Vector Store를 생성하고 있습니다.");

const vectorStore = await openAIRequest("/vector_stores", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: `kopilot-saving-knowledge-${new Date().toISOString().slice(0, 10)}`,
  }),
});

console.log(`[생성 완료] ${vectorStore.id}`);

for (const filename of filenames) {
  console.log(`[업로드] ${filename}`);

  const file = await uploadFile(filename);

  await openAIRequest(`/vector_stores/${vectorStore.id}/files`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file_id: file.id,
      attributes: {
        category: categoryByFilename[filename],
        locale: "ko-KR",
        status: "active",
        version: 1,
      },
    }),
  });

  console.log(`[업로드 완료] ${filename} (${file.id})`);
}

console.log("[인덱싱] 업로드한 문서의 검색 인덱스를 준비하고 있습니다.");

await waitUntilReady(vectorStore.id, filenames.length);

console.log("Saving knowledge Vector Store is ready.");
console.log(`OPENAI_SAVING_VECTOR_STORE_ID=${vectorStore.id}`);
