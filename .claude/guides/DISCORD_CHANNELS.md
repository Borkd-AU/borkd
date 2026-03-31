# Borkd Dev — Discord 채널 구조 및 권한

## 서버 구조

```
Borkd Dev (Discord Server)
├── CONTROL
│   ├── #control          — 메인 그룹 (NanoClaw 자동 응답, 사람 명령)
│   └── #alerts           — CI/CD 실패, 보안 이슈, 긴급 알림
├── DEVELOPMENT
│   ├── #dev-tasks        — 태스크 핸드오프 (Claude Code ↔ NanoClaw)
│   ├── #code-review      — PR 자동 리뷰 결과
│   └── #testing          — 테스트 실행/결과
├── LOGS
│   ├── #git-activity     — GitHub 웹훅 피드 (PR, push, merge)
│   └── #session-log      — 세션 요약 (양쪽 환경)
└── HUMAN
    └── #general          — Ryan 자유 채팅 (@NanoClaw 멘션 시만 응답)
```

## 채널별 상세

### #control (CONTROL)
- **목적**: NanoClaw 총괄 제어, 계획 관리, 태스크 위임
- **NanoClaw 그룹**: `borkd-control` (isMain: true)
- **트리거**: 불필요 (메인 그룹)
- **권한**: Ryan만 명령 가능
- **자동 포스트**: 하트비트 (10분), 일일 리포트

### #alerts (CONTROL)
- **목적**: 긴급 알림 전용
- **트리거**: CI 실패, 보안 이슈, 연결 끊김, 리밋 초과
- **권한**: NanoClaw + CI 웹훅만 쓰기

### #dev-tasks (DEVELOPMENT)
- **목적**: 코딩 태스크 할당 및 핸드오프
- **NanoClaw 그룹**: `borkd-dev`
- **트리거**: `@nano` 또는 자동 (IPC)
- **권한**: Ryan만 명령, NanoClaw 응답
- **사용 예**: "테스트 코드 작성해줘", "이 기능 구현해줘"

### #code-review (DEVELOPMENT)
- **목적**: PR 자동 리뷰 결과
- **NanoClaw 그룹**: `borkd-review`
- **트리거**: GitHub 웹훅 (PR 이벤트) 또는 `@nano`
- **권한**: 자동 트리거 허용 (GitHub webhook 메시지)
- **자동 액션**: PR 열림 → 코드 리뷰 → PR 코멘트 + 채널 리포트

### #testing (DEVELOPMENT)
- **목적**: 테스트 실행/결과 리포트
- **NanoClaw 그룹**: `borkd-test`
- **트리거**: 자동 (develop push) 또는 `@nano`
- **권한**: 자동 트리거 허용
- **자동 액션**: push to develop → `pnpm turbo test` → 결과 포스트

### #git-activity (LOGS)
- **목적**: GitHub 이벤트 피드 (읽기 전용)
- **소스**: GitHub 웹훅
- **권한**: CI-Webhook만 쓰기, NanoClaw 읽기만

### #session-log (LOGS)
- **목적**: 세션 요약 자동 기록
- **소스**: MacBook session-summary.sh 웹훅 + NanoClaw 세션 로그
- **권한**: 웹훅만 쓰기

### #general (HUMAN)
- **목적**: Ryan 자유 채팅
- **트리거**: `@NanoClaw` 멘션 시만 봇 응답
- **권한**: 모두 읽기/쓰기

## 역할 (Roles)

| Role | 채널 접근 | 비고 |
|------|----------|------|
| Admin (Ryan) | 모든 채널 R/W | 서버 관리 + 봇 관리 |
| NanoClaw (Bot) | CONTROL/DEV/LOGS R/W, HUMAN 멘션시만 | 봇 계정 |
| CI-Webhook | #git-activity, #alerts W | GitHub 웹훅 |

## 보안 규칙

1. `#control`, `#dev-tasks`: **Ryan만** 명령 가능 (sender-allowlist)
2. `#code-review`, `#testing`: 자동 트리거 허용 (웹훅 메시지)
3. `#git-activity`, `#session-log`: 쓰기 불가 (웹훅 전용)
4. 메시지 내 시크릿 패턴 차단: `sk_live_`, `service_role`, `DROP TABLE`
5. 메시지 길이 제한: 4000자
