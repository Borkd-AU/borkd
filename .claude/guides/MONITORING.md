# Borkd 모니터링 가이드

## 모니터링 아키텍처

```
MacBook Pro (Claude Code)              Mac Mini (NanoClaw)
├── Stop hook → heartbeat.json         ├── 10분 cron → heartbeat.json
├── Stop hook → Discord #session-log   ├── 10분 → Discord #control (하트비트)
└── Session start → heartbeat 확인      ├── 매시간 → token-monitor.sh
                                        └── 23:55 → daily report
```

## 1. 헬스 체크

### NanoClaw 하트비트
- **주기**: 10분
- **채널**: Discord `#control`
- **포맷**: `[HEARTBEAT] 2026-03-27 13:00 — containers: 2, last_msg: 3m ago, disk: 45%`
- **경고**: 30분 이상 하트비트 없으면 `#alerts`에 자동 경고

### 양방향 연결 상태
- **파일**: `.claude/context/heartbeat.json`
- **업데이트**: 양쪽 환경의 Stop hook/cron이 각자 필드 업데이트 + git push
- **확인**: 상대방 `last_seen`이 30분 이상 전이면 경고

## 2. AI 모델 리밋

### 설정값
| 파라미터 | 값 | 설명 |
|----------|-----|------|
| MAX_CONCURRENT_CONTAINERS | 3 | 동시 실행 컨테이너 |
| CONTAINER_TIMEOUT | 600000 (10분) | 컨테이너 타임아웃 |
| IDLE_TIMEOUT | 300000 (5분) | 유휴 타임아웃 |
| MAX_DAILY_RUNS | 50 | 일일 실행 한도 |

### 일일 비용 리포트
- **주기**: 매일 23:55
- **채널**: Discord `#control`
- **내용**: 실행 횟수, 총 런타임, 그룹별 통계, 비용 추정

### 한도 초과 알림
- 일일 실행 50회 초과 → `#alerts` 경고
- 동시 컨테이너 3개 초과 → 큐 대기 (NanoClaw 내장)

## 3. 연결 복구

| 상황 | 감지 방법 | 자동 복구 | 수동 조치 |
|------|----------|----------|----------|
| NanoClaw 다운 | 하트비트 중단 | launchd 자동 재시작 | `launchctl kickstart` |
| Git 동기화 실패 | heartbeat.json stale | `git pull --rebase` | 수동 merge |
| Discord 연결 끊김 | `isConnected()` false | discord.js 자동 재연결 | 토큰 확인 |
| 컨테이너 크래시 | exit code != 0 | 지수 백오프 (5회) | 로그 확인 |
| CI 실패 | GitHub webhook | `#alerts` 알림 | GitHub Actions 확인 |

## 4. 로그 관리

### 로그 위치
| 로그 | 위치 | 보존 |
|------|------|------|
| NanoClaw 프로세스 | stderr (Pino) | 실시간 |
| 컨테이너 실행 | `groups/*/logs/container-*.log` | 7일 → 압축, 30일 → 삭제 |
| 세션 요약 | `.claude/context/sessions/*.md` | 90일 → 삭제 |
| Discord 메시지 | Discord 서버 (영구) | N/A |

### 로그 로테이션 (Mac Mini crontab)
```bash
# 매주 일요일 — 7일+ 로그 압축
0 3 * * 0 find ~/nanoclaw/groups/*/logs/ -name '*.log' -mtime +7 -exec gzip {} \;
# 매월 1일 — 30일+ 압축 삭제
0 4 1 * * find ~/nanoclaw/groups/*/logs/ -name '*.gz' -mtime +30 -delete
# 매주 — 세션 요약 90일+ 정리
0 3 * * 0 find ~/Desktop/DEV/Borkd/borkd/.claude/context/sessions/ -name '*.md' -mtime +90 -delete
```

## 5. 알림 채널 정리

| 알림 유형 | Discord 채널 | 긴급도 |
|----------|-------------|--------|
| 하트비트 | #control | 정보 |
| 일일 리포트 | #control | 정보 |
| CI 실패 | #alerts | 높음 |
| 보안 이슈 | #alerts | 긴급 |
| 연결 끊김 | #alerts | 높음 |
| 리밋 초과 | #alerts | 중간 |
| PR 리뷰 완료 | #code-review | 정보 |
| 테스트 결과 | #testing | 정보 |
| 세션 요약 | #session-log | 정보 |
