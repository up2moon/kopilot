import assert from "node:assert/strict";
import test from "node:test";

import {
  hasKoreanFinalConsonant,
  withKoreanObjectParticle,
} from "./korean.js";

test("한글 마지막 글자의 종성 유무를 판별한다", () => {
  assert.equal(hasKoreanFinalConsonant("주문"), true);
  assert.equal(hasKoreanFinalConsonant("커피"), false);
});

test("받침 유무에 따라 을 또는 를을 붙인다", () => {
  assert.equal(withKoreanObjectParticle("배달 주문"), "배달 주문을");
  assert.equal(withKoreanObjectParticle("커피"), "커피를");
  assert.equal(withKoreanObjectParticle("쇼핑 결제"), "쇼핑 결제를");
});
