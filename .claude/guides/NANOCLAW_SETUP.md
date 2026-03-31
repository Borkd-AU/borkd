# NanoClaw Setup Guide for Borkd (Mac Mini)

이 가이드는 Mac Mini에서 NanoClaw를 Borkd 프로젝트와 연동하는 전체 과정을 설명합니다.

## Prerequisites

- macOS Mac Mini
- Node.js 20+
- Docker 또는 Apple Container
- NanoClaw 설치 완료 + launchd 데몬 동작 중
- Git + GitHub CLI (`gh`) 설치
- pnpm 10+ 설치

---

## Step 1: Borkd 레포 클론

```bash
git clone <BORKD_REPO_URL> ~/Desktop/DEV/Borkd/borkd
cd ~/Desktop/DEV/Borkd/borkd
pnpm install
```

---

## Step 2: Discord 봇 생성

1. [Discord Developer Portal](https://discord.com/developers/applications) 접속
2. **New Application** → 이름: `Borkd NanoClaw`
3. **Bot** 탭:
   - **Reset Token** → 토큰 복사 (한 번만 보임!)
   - **Privileged Gateway Intents** 활성화:
     - [x] MESSAGE CONTENT
     - [x] SERVER MEMBERS
     - [x] PRESENCE
4. **OAuth2 > URL Generator**:
   - Scopes: `bot`
   - Bot Permissions: `Send Messages`, `Read Message History`, `Manage Threads`, `Use External Emojis`
   - 생성된 URL 복사 → 브라우저에서 열어 "Borkd Dev" 서버에 초대

---

## Step 3: Discord 서버 구조 생성

"Borkd Dev" 서버에서 다음 카테고리/채널 생성:

```
CONTROL
├── #control
└── #alerts

DEVELOPMENT
├── #dev-tasks
├── #code-review
└── #testing

LOGS
├── #git-activity
└── #session-log

HUMAN
└── #general
```

각 채널의 권한은 `.claude/guides/DISCORD_CHANNELS.md` 참조.

---

## Step 4: 웹훅 설정

### GitHub → Discord (#git-activity)
1. `#git-activity` 채널 설정 > 통합 > 웹훅 > 새 웹훅 생성
2. 웹훅 URL 복사
3. GitHub repo > Settings > Webhooks > Add webhook
   - Payload URL: `<Discord_Webhook_URL>/github`
   - Content type: `application/json`
   - Events: `Pull requests`, `Pushes`, `Check runs`

### 세션 로그 웹훅 (#session-log)
1. `#session-log` 채널 > 웹훅 생성
2. URL을 Borkd 레포에 저장:
   ```bash
   echo "<WEBHOOK_URL>" > ~/Desktop/DEV/Borkd/borkd/.claude/discord-webhook.url
   ```

---

## Step 5: NanoClaw 환경 설정

### .env 수정
```bash
# NanoClaw .env에 추가/수정
DISCORD_BOT_TOKEN=<봇_토큰>
MAX_CONCURRENT_CONTAINERS=3
CONTAINER_TIMEOUT=600000
IDLE_TIMEOUT=300000
```

### mount-allowlist.json 설정
```bash
cat > ~/.config/nanoclaw/mount-allowlist.json << 'EOF'
{
  "allowedRoots": [
    {
      "path": "~/Desktop/DEV/Borkd",
      "allowReadWrite": true,
      "description": "Borkd project directory"
    }
  ],
  "blockedPatterns": [".ssh", ".gnupg", ".aws", "credentials", ".env", "id_rsa", "service_role", ".secret"],
  "nonMainReadOnly": false
}
EOF
```

### sender-allowlist.json 설정
```bash
# Discord 채널 ID들을 실제 값으로 교체
cat > ~/.config/nanoclaw/sender-allowlist.json << 'EOF'
{
  "discord:<control_channel_id>": {
    "allow": ["<ryan_discord_user_id>"],
    "mode": "trigger"
  },
  "discord:<dev_channel_id>": {
    "allow": ["<ryan_discord_user_id>"],
    "mode": "trigger"
  },
  "discord:<review_channel_id>": {
    "allow": "*",
    "mode": "trigger"
  },
  "discord:<test_channel_id>": {
    "allow": "*",
    "mode": "trigger"
  }
}
EOF
```

---

## Step 6: Discord 어댑터 설치

NanoClaw에서 Claude Code 실행 후:
```bash
cd ~/nanoclaw  # NanoClaw 설치 경로
claude
# Claude Code에서: /add-discord
```

또는 수동 설치:
```bash
npm install discord.js@^14
```

그리고 `src/channels/discord.ts` 구현 (Part 2 참조).

---

## Step 7: 그룹 등록

Discord `#control` 채널에서 NanoClaw에게 메시지:

```
그룹을 등록해줘:
1. borkd-control → #control (메인 그룹, 트리거 불필요)
2. borkd-dev → #dev-tasks (트리거: @nano)
3. borkd-review → #code-review (트리거: @nano)
4. borkd-test → #testing (트리거: @nano)

각 그룹의 컨테이너 설정:
- borkd-control: RW ~/Desktop/DEV/Borkd/borkd, timeout 600s
- borkd-dev: RW ~/Desktop/DEV/Borkd/borkd, timeout 900s
- borkd-review: RO ~/Desktop/DEV/Borkd/borkd, timeout 300s
- borkd-test: RW ~/Desktop/DEV/Borkd/borkd, timeout 600s
```

---

## Step 8: 예약 태스크 등록

### Git 활동 감시 (5분 cron)
```
#control에서:
@nano 예약 태스크 등록해줘:
- 이름: git-watcher
- 스케줄: */5 * * * * (5분마다)
- 그룹: borkd-review
- 내용: git fetch origin && gh pr list --state open --json number,title
  새 PR이면 자동 리뷰, 새 push면 테스트 실행
```

### 하트비트 (10분 cron)
```
@nano 하트비트 태스크 등록:
- 이름: heartbeat
- 스케줄: */10 * * * *
- 그룹: borkd-control
- 내용: 상태 보고 (컨테이너 수, 마지막 메시지 시간, 디스크 사용량)
```

### 일일 리포트 (매일 23:55)
```
@nano 일일 리포트 태스크:
- 이름: daily-report
- 스케줄: 55 23 * * *
- 그룹: borkd-control
- 내용: 오늘 실행 횟수, 총 런타임, 그룹별 통계, 비용 추정
```

---

## Step 9: 로그 관리 설정

```bash
# Mac Mini crontab 추가
crontab -e

# 추가할 내용:
# 매주 일요일 03:00 — 7일+ 로그 압축
0 3 * * 0 find ~/nanoclaw/groups/*/logs/ -name '*.log' -mtime +7 -exec gzip {} \;
# 매월 1일 — 30일+ 압축 로그 삭제
0 4 1 * * find ~/nanoclaw/groups/*/logs/ -name '*.gz' -mtime +30 -delete
# 매주 — 세션 요약 90일+ 정리
0 3 * * 0 find ~/Desktop/DEV/Borkd/borkd/.claude/context/sessions/ -name '*.md' -mtime +90 -delete
```

---

## Step 10: 검증

1. [ ] Discord `#control`에 메시지 → NanoClaw 응답 확인
2. [ ] `#code-review`에 `@nano 테스트` → borkd-review 그룹 처리 확인
3. [ ] 테스트 PR 생성 → 5분 내 자동 리뷰 확인
4. [ ] MacBook에서 세션 종료 → `#session-log`에 요약 확인
5. [ ] `#dev-tasks`에 코딩 태스크 위임 → NanoClaw 구현 확인
6. [ ] 하트비트가 `#control`에 10분마다 포스트되는지 확인
7. [ ] heartbeat.json이 git에 업데이트되는지 확인

---

## Troubleshooting

| 문제 | 확인 사항 |
|------|----------|
| 봇이 응답 안 함 | `.env`의 DISCORD_BOT_TOKEN 확인, NanoClaw launchd 상태 확인 |
| 그룹이 안 잡힘 | `#control`에서 직접 등록, discord-config.json 채널 ID 확인 |
| 컨테이너 실패 | `groups/<group>/logs/` 확인, mount-allowlist.json 경로 확인 |
| Git 동기화 실패 | `gh auth status` 확인, SSH key 또는 HTTPS token 확인 |
| 웹훅 안 옴 | GitHub webhook deliveries 확인, Discord 웹훅 URL 확인 |
