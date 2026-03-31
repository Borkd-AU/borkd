# Garbage Collection Checklist

NanoClaw 주간 cron으로 실행. 각 항목을 스캔하고 위반 발견 시 자동 PR 생성.

## 1. Documentation Consistency

- [ ] CLAUDE.md의 파일 구조 패턴 ↔ 실제 디렉토리 구조 일치
- [ ] docs/ARCHITECTURE.md ↔ 실제 워크스페이스 구조 일치
- [ ] TOKEN_MAP.md ↔ tailwind.config.ts 색상 값 동기화
- [ ] COMPONENT_MAP.md ↔ 실제 사용 라이브러리 버전 일치
- [ ] package.json 버전 ↔ docs에 기록된 버전 일치

## 2. Code Quality

- [ ] 미사용 import 탐지 (Biome로 체크 가능)
- [ ] 미사용 export 탐지
- [ ] 중복 코드 블록 (>10줄 동일)
- [ ] console.log/console.error 잔재 (개발용)
- [ ] TODO/FIXME/HACK 주석 목록화 + 추적

## 3. Architecture Violations

- [ ] apps/mobile → apps/admin 직접 import 없음
- [ ] packages/shared → apps/* import 없음
- [ ] apps/* → supabase/functions/ import 없음
- [ ] 각 워크스페이스의 package.json이 올바른 의존성만 선언

## 4. Design System Drift

- [ ] 하드코딩된 hex 색상값 탐지 (tailwind 토큰 대신 직접 #XXX 사용)
- [ ] mobile에서 admin 토큰 사용 또는 반대
- [ ] 커스텀 border-radius 대신 정의된 토큰 사용

## 5. Security Audit

- [ ] .env 파일이 gitignore에 포함되어 있는지
- [ ] 코드에 API key/token 패턴 없는지
- [ ] Supabase 마이그레이션에 RLS 포함되어 있는지
- [ ] Edge Function에서만 service_role 사용하는지

## 6. Test Coverage

- [ ] features/ 내 비즈니스 로직 파일에 대응하는 테스트 존재
- [ ] 새로 추가된 Zod 스키마에 대한 검증 테스트
- [ ] Edge Function에 대한 테스트

## 7. Stale Context

- [ ] .claude/context/current-task.md가 "idle"이 아닌데 7일+ 업데이트 없음
- [ ] .claude/context/sessions/ 파일 90일+ 정리
- [ ] .claude/eval/reviews/ 파일 정리 (180일+)
- [ ] .claude/context/heartbeat.json의 last_seen이 최신인지

## GC Report Format

```markdown
# GC Report: YYYY-MM-DD

## Summary
- Violations found: N
- Auto-fixable: N
- Needs review: N

## Violations
### [Category] Description
- File: path/to/file
- Issue: 구체적 설명
- Auto-fix: Y/N
- PR: #NNN (if auto-fixed)

## Quality Grades
| Area | Grade | Trend |
|------|-------|-------|
| Documentation | A/B/C/D/F | ↑↓→ |
| Code Quality | A/B/C/D/F | ↑↓→ |
| Architecture | A/B/C/D/F | ↑↓→ |
| Design System | A/B/C/D/F | ↑↓→ |
| Security | A/B/C/D/F | ↑↓→ |
| Test Coverage | A/B/C/D/F | ↑↓→ |
```

**파일 위치**: `.claude/eval/gc-reports/YYYY-MM-DD.md`
