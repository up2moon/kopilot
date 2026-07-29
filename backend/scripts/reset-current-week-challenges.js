/**
 * 현재 주(월~금)의 AI 챌린지를 삭제해, 다음 `GET /api/users/me/challenges` 요청에서
 * 최신 생성 로직·문구로 다시 생성되도록 하는 일회성 유지보수 스크립트.
 *
 * 생성 로직이나 문구 템플릿을 바꾼 뒤, 이미 저장된 이번 주 챌린지를 새 버전으로
 * 교체하고 싶을 때 사용한다. 지난 주 이전 챌린지(이력)은 건드리지 않는다.
 *
 * 실행: docker compose -f compose.dev.yml exec backend node scripts/reset-current-week-challenges.js
 */
import { Op } from "sequelize";

import "../src/config/env.js";
import { sequelize } from "../src/db.js";
import { AiChallenge } from "../src/models/index.js";
import { getKoreanToday } from "../src/services/challengeService.js";

function toMonday(dateString) {
  const date = new Date(`${dateString}T12:00:00.000Z`);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return date.toISOString().slice(0, 10);
}

function getWeekDates(weekStart) {
  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(`${weekStart}T12:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

async function main() {
  const weekStart = toMonday(getKoreanToday());
  const weekDates = getWeekDates(weekStart);

  const deleted = await AiChallenge.destroy({
    where: { challenge_date: { [Op.in]: weekDates } },
  });

  console.log(`이번 주(${weekDates[0]} ~ ${weekDates[4]}) 챌린지 ${deleted}건 삭제 완료.`);
  console.log("다음 챌린지 조회 시 최신 로직·문구로 재생성됩니다.");
}

main()
  .catch((error) => {
    console.error("챌린지 재설정 실패:", error);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
