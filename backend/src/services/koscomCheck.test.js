import assert from "node:assert/strict";
import test from "node:test";

import { callKoscom } from "./koscomCheck.js";

test("로컬 환경에서는 CHECK 요청을 운영 WAS 프록시로 전달한다", async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCustId = process.env.CUST_ID;
  const originalAuthKey = process.env.AUTH_KEY;
  const originalFetch = globalThis.fetch;
  let request;

  process.env.NODE_ENV = "development";
  process.env.CUST_ID = "test-customer";
  process.env.AUTH_KEY = "test-auth-key";
  globalThis.fetch = async (url, options) => {
    request = {
      url: String(url),
      options,
    };

    return new Response(JSON.stringify({ output: [{ close: "70000" }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    await callKoscom("/stock/m001/basic_info", { isu_cd: "005930" });

    assert.equal(
      request.url,
      "https://kospay.p-e.kr/api/investment/check-proxy",
    );
    assert.equal(
      request.options.headers["X-Koscom-Cust-Id"],
      "test-customer",
    );
    assert.deepEqual(JSON.parse(request.options.body), {
      path: "/stock/m001/basic_info",
      params: { isu_cd: "005930" },
    });
  } finally {
    globalThis.fetch = originalFetch;

    const restoreEnvironment = (key, value) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    };

    restoreEnvironment("NODE_ENV", originalNodeEnv);
    restoreEnvironment("CUST_ID", originalCustId);
    restoreEnvironment("AUTH_KEY", originalAuthKey);
  }
});
