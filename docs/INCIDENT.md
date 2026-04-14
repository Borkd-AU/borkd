# Incident Response Runbook

프로덕션 장애가 터졌을 때 이 문서대로.

## 5단계 프로세스

**Detect → Communicate → Stabilize → Fix → Post-mortem**

### 1. Detect (발견)

**증상 유입 경로:**
- Sentry 알림 (에러 급증)
- PostHog 대시보드 (DAU/크래시율 이상)
- 고객 리포트 (Discord #support, 이메일)
- Health check 실패 (Vercel / Supabase 알림)

**즉시 할 일 (1분 내):**
- Slack `#borkd-incidents` 채널에 thread 시작: "🚨 INCIDENT: <한 문장 증상>"
- Severity 부여:
  - **SEV1**: 앱 크래시 / 로그인 불가 / 데이터 손실. 전체 영향.
  - **SEV2**: 일부 기능 동작 불가. 부분 영향.
  - **SEV3**: 성능 저하 / 일부 사용자만.

### 2. Communicate (소통)

**SEV1:**
- Slack thread 즉시 열기
- 팀 전체 @channel (Steph, Joon, Roy)
- 사용자 공지: 상태 페이지 업데이트 (status.borkd.com — Phase 10에서 세팅)

**SEV2-3:**
- Slack thread
- 관련 담당자 태그

**5분마다 thread에 업데이트.** 침묵 = 혼돈.

### 3. Stabilize (안정화) — 최우선

**목표: 일단 사용자 피해 멈추기.** 근본 원인보다 **롤백이 먼저**.

결정 트리:
```
최근 30분 안에 배포했는가?
├── YES → docs/ROLLBACK.md 실행 (Vercel / EAS / Supabase)
└── NO → 외부 의존성 확인
         ├── Supabase status.supabase.com
         ├── Mapbox status.mapbox.com
         ├── Vercel status.vercel.com
         └── Apple / Google Dev status
```

롤백 성공 → 사용자 피해 정지 → 시간 벌면서 4단계.
외부 의존성 문제 → 고객 공지 + vendor 티켓 + 기다리기.

### 4. Fix (수정)

안정화 후:

1. 재현 환경 구축
   - `git checkout <실패 commit>` + 로컬 Supabase branch DB
   - 또는 Supabase branching PR으로 재현
2. `hotfix/<issue-slug>` 브랜치 생성 (`docs/HOTFIX.md` 절차)
3. 테스트 추가 → 수정 → PR → 머지 → 배포
4. Staging에서 24h 관찰 → Production 배포 확인

### 5. Post-mortem (사후 분석)

**SEV1/2는 필수. SEV3은 선택.**

24시간 내 `docs/postmortems/<date>-<slug>.md` 작성:

```markdown
# Post-mortem: <incident title>

**Date:** 2026-MM-DD
**Severity:** SEV1/2/3
**Duration:** Detection → Resolution minutes
**Author:** <name>

## Impact
- 영향 받은 사용자 수 / 데이터 손실 / 매출 영향

## Timeline (UTC)
- 14:32 Sentry 알림 시작
- 14:35 Slack thread 시작
- 14:45 Vercel rollback 실행 → 사용자 복구
- 15:20 근본 원인 식별
- 16:00 hotfix PR merge
- 17:30 프로덕션 배포 완료

## Root cause
- 기술적 원인 한 문단

## What went well
- 롤백이 5분 안에 성공
- Sentry 알림 빠름

## What went wrong
- 배포 전 staging QA 부족
- 롤백 절차 한 번도 연습 안 해봄

## Action items
- [ ] @Ryan: staging smoke test 자동화 (P1, 1주일)
- [ ] @Steph: status page 구축 (P2, 2주일)
- [ ] 롤백 리허설 월 1회 (recurring)
```

**No-blame 문화**: 사람 탓 아님, 시스템 개선.

## Severity 정의 (구체)

| Severity | 예시 | 목표 응답 시간 | 목표 해결 시간 |
|----------|------|--------------|---------------|
| SEV1 | 앱 실행 즉시 크래시 / DB 데이터 손실 / 로그인 100% 실패 | 5분 | 1시간 (rollback) |
| SEV2 | 특정 기능 (walk recording) 일부 사용자 불가 | 30분 | 24시간 |
| SEV3 | 지도 타일 느리게 로드 / UI 깨짐 (crash 없음) | 4시간 | 1주일 |

## 연락처 (on-call)

- **Primary**: Ryan (MacBook Pro, Claude Code)
- **Backup**: NanoClaw (Mac Mini, 24/7 모니터링)
- **External**: Supabase support, Mapbox support, Sentry support

Phase 10에서 `docs/ENVIRONMENTS.md`에 세부 연락처.

## Related runbooks

- `docs/ROLLBACK.md` — Vercel/EAS/Supabase 롤백 절차
- `docs/HOTFIX.md` — main에서 hotfix 머지 + back-merge 절차
- `supabase/migrations/_CONVENTIONS.md` — migration 안전성 규칙
