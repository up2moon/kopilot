# Repository Guidelines

## Project Structure & Module Organization

This repository currently contains a small Codex configuration surface:

- `codex.yaml` stores plugin/MCP configuration for the workspace.
- `AGENTS.md` provides contributor and agent guidance.

No application source, tests, or asset directories are present yet. When code is added, prefer conventional top-level folders such as `src/` for implementation, `tests/` for automated tests, and `assets/` or `public/` for static files. Keep configuration files at the repository root unless a tool requires a nested location.

## Build, Test, and Development Commands

There is no build system or package manager manifest in this repository yet. Add documented commands alongside the relevant tooling when the project gains source code. Examples:

- `npm test`: run JavaScript or TypeScript tests when a `package.json` is introduced.
- `pytest`: run Python tests when a Python test suite is added.
- `make build`: run a project-wide build if a `Makefile` is added.

Until then, validate changes by checking YAML syntax and reviewing diffs:

- `git diff`: inspect local changes before review.

## Coding Style & Naming Conventions

Keep YAML files two-space indented and use clear lowercase keys, as in `codex.yaml`. Prefer descriptive file and directory names: `src/figma/`, `tests/config/`, or `docs/setup.md`. If a language-specific formatter is introduced, document and use it consistently rather than relying on manual formatting.

## Testing Guidelines

No automated tests are configured yet. When adding functionality, include focused tests in `tests/` or the framework’s standard test location. Name tests after the behavior they verify, for example `test_config_loads.py` or `config-loader.test.ts`. Document the exact test command in this file and in any project README.

## Commit & Pull Request Guidelines

This directory is not currently initialized as a Git repository, so no local commit history conventions are available. Use short, imperative commit messages such as `Add Codex plugin config` or `Document contributor workflow`. Pull requests should include a concise description, relevant context or linked issue, validation steps run, and screenshots only when UI or Figma-facing behavior changes.

## Security & Configuration Tips

Treat plugin credentials and access tokens as secrets. Do not commit live tokens in `codex.yaml`; use local environment variables or an ignored local override file when possible. Rotate any token that has been exposed in repository history or shared logs.

## Kopilot 디자인 작업 규칙

Kopilot 화면을 만들거나 수정할 때는 `DESIGN.md`의 참고 화면과 규칙을 먼저 확인한다. 현재 기준 화면은 Figma의 로그인 화면과 회원가입 화면이다. 새로운 화면에 대한 작업 명령이 주어지면 해당 와이어프레임에 대한 주소를 DESIGN.md의 `참고 화면`에 기록한다.

- 전체 분위기는 토스처럼 간결하고 신뢰감 있게 유지한다.
- 웹 화면은 기본적으로 `1440 x 900` 아트보드를 사용한다.
- 주요 색상은 `#3182F6`, 배경은 `#F7F9FC`, 긍정 수치 강조는 `#00A661`을 기준으로 한다.
- 폰트는 Figma에서 사용 가능한 `Noto Sans KR`과 `Inter` 조합을 우선한다.
- 좌측에는 제품 가치와 혜택, 우측에는 핵심 액션 폼을 배치하는 구조를 우선 검토한다.
- 버튼과 입력 필드는 높이 58px, 라운드 14~16px, 넉넉한 내부 여백을 유지한다.
- 문구는 짧고 행동 중심으로 작성하며, 소비 분석, AI 절약 코치, 절약 챌린지, 미래 자산 가치 시뮬레이션 가치를 자연스럽게 드러낸다.
- 투자 관련 표현은 투자 권유가 아니라 참고용 시뮬레이션이라는 점을 명확히 한다.
