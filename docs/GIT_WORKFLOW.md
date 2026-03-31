# Borkd Git Workflow

## Branch Strategy

```
main (production)
 ├── staging (pre-production, QA)
 │    └── develop (integration)
 │         ├── feat/<scope>
 │         ├── fix/<scope>
 │         └── refactor/<scope>
```

| Branch | Deploys To | Protection |
|--------|------------|------------|
| `main` | EAS Production + Admin Production + Supabase Production | PR only, CI + review |
| `staging` | EAS Staging + Supabase Staging | PR only, CI |
| `develop` | EAS Preview + Admin Preview | PR only, CI |
| Feature branches | — | — |

## Flow

1. `develop` → `feat/<scope>` 브랜치
2. 구현 + 테스트 + Sprint Contract 충족
3. PR → `develop` (Tier 1 CI + Tier 2 NanoClaw + Tier 3 사람)
4. `develop` → `staging` (QA)
5. `staging` → `main` (릴리스)

## Hotfix

`main` → `hotfix/<description>` → PR → `main` + `develop` 둘 다

## Naming

### Branches
`feat/<scope>`, `fix/<scope>`, `refactor/<scope>`, `docs/<scope>`, `hotfix/<description>`

### Commits
Conventional commits: `type(scope): description`

| Type | Usage |
|------|-------|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `refactor` | 리팩토링 |
| `docs` | 문서 |
| `test` | 테스트 |
| `chore` | 잡일 |
| `style` | 스타일 |
| `perf` | 성능 |
| `ci` | CI/CD |

Scopes: `mobile`, `admin`, `shared`, `supabase`, `config`, `ci`

## PR Evaluation Pipeline

```
PR → Tier 1 (CI) → Tier 2 (NanoClaw Rubric) → Tier 3 (Human) → Merge
```

상세: `.claude/eval/EVAL_RUBRIC.md`

## Worktree

병렬 작업 시:
```bash
git worktree add ../borkd-feat-walk feat/mobile-walk-tracking
git worktree remove ../borkd-feat-walk
```

`node_modules`, `.expo`, `.turbo`, `.next` symlink 공유 (settings.json).

## 금지 사항

- main/staging/develop 직접 push 금지
- Force push 금지 (hook 차단)
- `supabase db reset` 금지 (hook 차단)
