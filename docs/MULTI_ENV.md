# Borkd Multi-Environment Guide

## Environments

| Environment | Device | Agent | Role |
|------------|--------|-------|------|
| Claude Code | MacBook Pro | Claude | 주 개발 |
| NanoClaw | Mac Mini | Claude (containerized) | 리뷰, 테스트, 병렬 개발, 모니터링 |

## Communication

| Channel | Purpose | Protocol |
|---------|---------|----------|
| Discord "Borkd Dev" | 자동화 소통 | `.claude/guides/DISCORD_CHANNELS.md` |
| Telegram | 기존 1:1 소통 | 텍스트 |
| Git | 코드 + 컨텍스트 동기화 | PR, commits, context files |

## Context Synchronization

### Files (git-tracked)
- `.claude/context/current-task.md` — 현재 작업 + Lock
- `.claude/context/heartbeat.json` — 양방향 연결 상태
- `.claude/context/MULTI_MODEL_PROTOCOL.md` — 소통 규약
- `.claude/context/decisions/` — ADR
- `.claude/context/review-requests/` — 리뷰 요청
- `.claude/context/reviews/` — 리뷰 응답

### Heartbeat
양쪽 환경이 10분마다 `.claude/context/heartbeat.json` 업데이트.
30분+ 미응답 시 Discord `#alerts` 경고.

## Task Locking

```markdown
- **Locked by**: claude-code | nanoclaw | none
- **Lock acquired**: ISO timestamp
```

1. 작업 시작 전 Lock 확인
2. `Locked by` 설정 후 작업
3. 잠겨있으면 **다른 브랜치**에서 작업
4. 완료 시 `none`으로 해제 + git push
5. 충돌 시 Discord `#control` 알림

## Evaluation Pipeline

### Per-PR (3-Tier)
1. **Tier 1**: CI (타입 체크, 린트, 테스트, 보안 스캔, 아키텍처 체크)
2. **Tier 2**: NanoClaw 루브릭 (4기준 스코어링, 하드 임계값)
3. **Tier 3**: 사람 승인

### Weekly (Garbage Collection)
NanoClaw가 주간 코드 품질 스캔 → 자동 PR 생성

### Continuous (Monitoring)
- 10분 하트비트
- 시간당 토큰 모니터
- 일일 비용 리포트

## Setup Guides

- NanoClaw 설정: `.claude/guides/NANOCLAW_SETUP.md`
- Discord 채널: `.claude/guides/DISCORD_CHANNELS.md`
- 모니터링: `.claude/guides/MONITORING.md`
- 평가 루브릭: `.claude/eval/EVAL_RUBRIC.md`
