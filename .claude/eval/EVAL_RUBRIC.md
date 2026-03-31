# Borkd Evaluation Rubric

## Overview

모든 PR은 머지 전 3계층 평가를 통과해야 한다.

```
PR 생성 → Tier 1 (CI 자동) → Tier 2 (NanoClaw 루브릭) → Tier 3 (사람 승인) → 머지
```

## Tier 1: Deterministic Checks (CI — 자동)

| Check | Tool | Pass Criteria |
|-------|------|--------------|
| Type check | `pnpm turbo check` | 0 errors |
| Lint | `pnpm turbo lint` | 0 errors |
| Tests | `pnpm turbo test` | All pass |
| Secret scan | `scan-secrets.sh` | No patterns detected |
| Commit format | `validate-commit-msg.sh` | Conventional commits |
| Architecture | `check-architecture.sh` | No dependency violations |

**Tier 1 실패 시**: PR 자동 블록. 피드백은 CI 로그에서 확인.

## Tier 2: Model-Assisted Rubric (NanoClaw — 자동)

### 4-Criterion Scoring

각 기준은 1-10 점수. **하드 임계값 미달 시 PR 실패.**

### 1. Functionality (기능 완성도) — 임계값: 7/10

| 점수 | 기준 |
|------|------|
| 9-10 | 모든 요구사항 충족 + 엣지 케이스 처리 + 에러 핸들링 완벽 |
| 7-8 | 핵심 요구사항 충족 + 주요 엣지 케이스 처리 |
| 5-6 | 기본 기능 동작하지만 엣지 케이스 미처리 |
| 3-4 | 부분적 동작, 주요 기능 누락 |
| 1-2 | 거의 동작하지 않음 |

**검증 방법**:
- Sprint Contract의 DoD 체크리스트 대조
- 테스트 커버리지 확인
- 수동 시나리오 테스트 (가능한 경우)

### 2. Code Quality (코드 품질) — 임계값: 6/10

| 점수 | 기준 |
|------|------|
| 9-10 | CLAUDE.md 완벽 준수 + 기존 패턴과 일관 + 재사용성 높음 |
| 7-8 | 컨벤션 준수 + 읽기 쉬운 코드 + 적절한 추상화 |
| 5-6 | 대체로 준수하지만 일부 패턴 불일치 |
| 3-4 | 컨벤션 위반 다수 + 중복 코드 |
| 1-2 | 구조 없음, 하드코딩, 이해 불가 |

**검증 방법**:
- CLAUDE.md 규칙 대조 (네이밍, 파일 구조, import 패턴)
- 중복 코드 탐지
- 불필요한 복잡도 확인

### 3. Design Fidelity (디자인 충실도) — 임계값: 7/10

| 점수 | 기준 |
|------|------|
| 9-10 | TOKEN_MAP 완벽 준수 + 올바른 앱 토큰 + COMPONENT_MAP 매칭 |
| 7-8 | 대부분 올바른 토큰 사용 + 컴포넌트 매핑 준수 |
| 5-6 | 일부 토큰 오용 (mobile↔admin 혼동) |
| 3-4 | 다수 토큰 오용 + 하드코딩된 색상값 |
| 1-2 | 디자인 시스템 무시 |

**검증 방법**:
- `.claude/design/TOKEN_MAP.md` 대조
- `.claude/design/COMPONENT_MAP.md` 대조
- 하드코딩된 hex 값 탐지
- 대상 앱(mobile/admin) 토큰 정확성

### 4. Security (보안) — 임계값: 8/10

| 점수 | 기준 |
|------|------|
| 9-10 | 완벽한 RLS + 입력 검증 + 시크릿 관리 + 인증 확인 |
| 7-8 | RLS 준수 + 기본 입력 검증 + 시크릿 노출 없음 |
| 5-6 | RLS 있지만 불완전 + 일부 검증 누락 |
| 3-4 | RLS 미적용 테이블 존재 + 검증 부족 |
| 1-2 | 시크릿 노출 또는 심각한 보안 결함 |

**검증 방법**:
- Supabase 마이그레이션에 RLS 포함 여부
- `scan-secrets.sh` 결과
- 사용자 입력 Zod 검증 확인
- service_role 사용 패턴 확인

## Tier 2 Output Format

```markdown
# PR Review: #<number> — <title>
- Reviewer: NanoClaw (borkd-review)
- Date: YYYY-MM-DD
- Sprint Contract: .claude/context/current-task.md

## Scores
| Criterion | Score | Threshold | Pass |
|-----------|-------|-----------|------|
| Functionality | X/10 | 7 | Y/N |
| Code Quality | X/10 | 6 | Y/N |
| Design Fidelity | X/10 | 7 | Y/N |
| Security | X/10 | 8 | Y/N |

## Overall: PASS / FAIL

## Detailed Feedback

### Functionality
(구체적 피드백 — 통과한 DoD 항목, 실패한 항목)

### Code Quality
(구체적 피드백 — 패턴 준수, 위반 사항)

### Design Fidelity
(구체적 피드백 — 토큰 정확성, 컴포넌트 매핑)

### Security
(구체적 피드백 — RLS, 시크릿, 입력 검증)

## Action Items
- [ ] (수정 필요 사항 1)
- [ ] (수정 필요 사항 2)
```

**파일 위치**: `.claude/eval/reviews/YYYY-MM-DD-PR-NNN.md`

## Tier 3: Human Review (사람 — 수동)

- Tier 1 + Tier 2 통과 후에만 사람 리뷰 요청
- 사람은 전략적 판단 집중: 아키텍처 적합성, 비즈니스 로직 정확성, UX 적절성
- 사람이 거부하면 피드백 → Failure Registry에 기록

## Few-Shot Calibration

NanoClaw Evaluator의 채점 편향을 방지하기 위해:

1. **기준선 설정**: 첫 10개 PR은 사람이 병행 채점하여 NanoClaw 점수와 비교
2. **편향 교정**: NanoClaw가 너무 관대하면 프롬프트에 "be skeptical" 추가
3. **분기별 재캘리브레이션**: 모델 업데이트 시 기준선 재설정

## Self-Evaluation 금지

**절대 규칙**: 코드를 생성한 에이전트가 같은 코드를 평가하지 않는다.
- Claude Code가 구현 → NanoClaw가 평가
- NanoClaw가 구현 → Claude Code가 평가 (또는 사람)
