# Multi-Model Collaboration Protocol

## Overview

Claude, Codex, Gemini가 git 기반으로 소통하는 규약.
모든 소통은 git repo를 통해 이루어지며, 직접적인 API 호출은 없음.

## Communication Channels

### Primary: Discord "Borkd Dev" 서버
| 채널 | 용도 |
|------|------|
| `#control` | 총괄 제어, 계획 관리 (NanoClaw main group) |
| `#dev-tasks` | 태스크 핸드오프 (Claude Code ↔ NanoClaw) |
| `#code-review` | PR 자동 리뷰 결과 |
| `#testing` | 테스트 실행/결과 |
| `#git-activity` | GitHub 웹훅 (읽기 전용) |
| `#session-log` | 세션 요약 (양쪽 환경) |
| `#alerts` | 긴급 알림 (CI 실패, 보안, 연결 끊김) |

### Secondary: Git
- **코드**: PR, 리뷰 코멘트, 브랜치
- **리뷰 요청**: `.claude/context/review-requests/YYYY-MM-DD-<topic>.md`
- **리뷰 응답**: `.claude/context/reviews/YYYY-MM-DD-<topic>-<model>.md`
- **상태 동기화**: `.claude/context/heartbeat.json`

## Standard Feature Workflow

```
1. Claude (MacBook) — 기능 구현 + 브랜치 생성 + PR 오픈
2. Nano-Claude (Mac Mini) — 자동 리뷰 (코드 품질, 보안, 일관성)
3. Codex — 크로스 밸리데이션 (로직, 엣지 케이스)
4. Gemini — 아키텍처 레벨 리뷰 (필요시)
5. Human — 최종 승인 + 머지
```

## Review Request Format

```markdown
# Review Request: <topic>
- Date: YYYY-MM-DD
- Branch: feat/<scope>
- Author: <model-name>
- Priority: high | medium | low

## Changes Summary
(무엇을 변경했는지 요약)

## Review Points
- [ ] 로직 검증
- [ ] 보안 확인
- [ ] 타입 안전성
- [ ] 기존 패턴과의 일관성
- [ ] 엣지 케이스

## Files Changed
(변경된 파일 목록)
```

## Review Response Format

```markdown
# Review: <topic>
- Reviewer: <model-name>
- Date: YYYY-MM-DD
- Verdict: approve | request-changes | comment

## Feedback
(구체적 피드백)

## Issues Found
(발견된 문제점)

## Suggestions
(개선 제안)
```

## Model-Specific Notes

### Claude (Primary Developer)
- 전체 구현 담당
- CLAUDE.md 규약 준수
- PR 생성 + 리뷰 요청 작성

### NanoClaw (Mac Mini — Developer + Monitor)
- **개발**: 기능 구현, 테스트 작성 (Discord `#dev-tasks`)
- **리뷰**: PR 자동 리뷰 (Discord `#code-review`)
- **테스트**: 자동 테스트 실행 (Discord `#testing`)
- **모니터링**: 하트비트, 일일 리포트, 연결 상태 (Discord `#control`)
- **보안**: 코드 보안 스캔, 시크릿 탐지
- **계획**: 전체 태스크 추적, 진행률 관리

### Codex (Cross-Validation)
- 전체 파일 컨텍스트 제공 필요 (diff만으로는 부족)
- 로직 검증 + 엣지 케이스 탐지
- 테스트 코드 리뷰

### Gemini (Architecture Review)
- 아키텍처 레벨 결정 시 활용
- 대규모 리팩토링 검토
- 기술 선택 비교 분석

## Conflict Resolution

- 모델 간 의견 충돌 시 **Human이 최종 판단**
- 보안 관련 이슈는 **가장 보수적인 의견** 채택
- 성능 vs 가독성 충돌 시 **가독성 우선** (프로덕션 병목 제외)

## Auto-Trigger Rules

| Git Event | Discord 채널 | NanoClaw 액션 |
|-----------|-------------|--------------|
| PR opened/updated | #code-review | 자동 코드 리뷰 → PR 코멘트 |
| Push to develop | #testing | `pnpm turbo test` + `pnpm turbo check` |
| Push to staging | #testing | 통합 테스트 + 리포트 |
| Merge to main | #control | 프로덕션 체크리스트 검증 |
| CI failure | #alerts | 에러 분석 + 수정 제안 |

## Monitoring Protocol

- **하트비트**: NanoClaw 10분 cron → `#control` + `heartbeat.json`
- **일일 리포트**: 23:55 → `#control` (실행 횟수, 런타임, 비용 추정)
- **연결 확인**: 양쪽 Stop hook이 `heartbeat.json` 업데이트
- **경고**: 30분+ 하트비트 없음 → `#alerts`
- **리밋**: 일일 50회 컨테이너 실행 한도, 동시 3개
