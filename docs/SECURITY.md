# Borkd Security Rules

## Secrets Management

| Secret | Storage | Access |
|--------|---------|--------|
| Supabase anon key | `.env.local` (gitignored) | Client apps |
| Supabase service_role | Edge Functions env only | Server-side only |
| EXPO_TOKEN | GitHub Secrets | CI/CD only |
| SUPABASE_ACCESS_TOKEN | GitHub Secrets | CI/CD only |
| DISCORD_BOT_TOKEN | NanoClaw `.env` | NanoClaw only |
| Discord webhook URLs | `.claude/discord-webhook.url` (gitignored) | Hooks only |

## Enforcement

### Automated (Hooks)

| Check | Hook | Action |
|-------|------|--------|
| Secret patterns in code | `scan-secrets.sh` (PreToolUse) | Block write |
| Dangerous commands | `block-dangerous-cmds.sh` (PreToolUse) | Block execution |
| Commit message | `validate-commit-msg.sh` (PostToolUse) | Warn |
| Architecture violations | `check-architecture.sh` (PostToolUse) | Warn |

### CI (Automated)

| Check | Workflow |
|-------|----------|
| Secret patterns in repo | `ci.yml` security-scan job |
| .env files committed | `ci.yml` security-scan job |

### Manual (Eval Rubric)

Security criterion: **임계값 8/10** (가장 높은 임계값)

## Blocked Patterns

Hook `scan-secrets.sh`가 소스코드에서 차단하는 패턴:
- `sk_live_` / `sk_test_` (Stripe)
- `eyJhbGciOi` (JWT)
- `service_role`
- `-----BEGIN.*PRIVATE KEY`
- `supabase_service_role_key`
- `SUPABASE_SERVICE_ROLE`

## Blocked Commands

Hook `block-dangerous-cmds.sh`가 차단하는 명령:
- `rm -rf /` (루트/부모 삭제)
- `git push --force main` (메인 브랜치 force push)
- `DROP TABLE/DATABASE/SCHEMA`
- `ALTER TABLE ... DISABLE ROW LEVEL SECURITY`
- `supabase db reset`

## RLS Rules

- 모든 테이블에 RLS 활성화 (예외 없음)
- 새 마이그레이션에 RLS policy 포함 필수
- RLS 비활성화 SQL은 hook이 차단

## Client-Side Rules

- `anon` key만 클라이언트에서 사용
- `EXPO_PUBLIC_` prefix로만 환경변수 노출
- `service_role` key는 Edge Functions 전용
- `.env` 파일 내용 출력/로깅 금지

## Container Security (NanoClaw)

- `.env` → `/dev/null` 마운트 (시크릿 숨김)
- blockedPatterns: `.ssh`, `.gnupg`, `.aws`, `credentials`, `service_role`
- review 그룹은 read-only 마운트
- mount-allowlist.json은 컨테이너 외부에 저장 (tamper-proof)
