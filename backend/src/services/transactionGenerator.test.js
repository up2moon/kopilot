import assert from "node:assert/strict";
import test from "node:test";

import {
  generateFixtureTransactions,
  getTransactionCategoryCode,
} from "./transactionGenerator.js";

test("테스트 거래는 최근 6개월에 분산되고 월별 합계가 서로 다르다", () => {
  const { transactions } = generateFixtureTransactions();
  const monthly = new Map();

  for (const transaction of transactions) {
    const month = transaction.approvedAt.slice(0, 7);
    const summary = monthly.get(month) || { count: 0, amount: 0 };

    summary.count += 1;
    summary.amount += transaction.amount;
    monthly.set(month, summary);
  }

  assert.equal(monthly.size, 6);
  assert.ok([...monthly.values()].every((month) => month.count >= 7));
  assert.ok(new Set([...monthly.values()].map((month) => month.amount)).size > 1);
});

test("모든 생성 카테고리는 DB 규격에 맞는 2자리 코드를 사용한다", () => {
  const { transactions } = generateFixtureTransactions();

  assert.ok(
    transactions.every(
      (transaction) =>
        getTransactionCategoryCode(transaction.category).length === 2,
    ),
  );
});
