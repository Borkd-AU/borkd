# ADR-001: Discord 기반 멀티에이전트 소통

- **Date**: 2026-03-27
- **Status**: accepted
- **Author**: Ryan Song + Claude Code

## Context

Borkd 프로젝트에서 MacBook Pro (Claude Code)와 Mac Mini (NanoClaw) 간 멀티에이전트 협업이 필요. 자동 트리거(git 이벤트), 양방향 소통, 사람 개입을 지원하는 채널이 필요했음.

## Decision

**Discord를 멀티에이전트 소통 채널로 채택.**

NanoClaw에 Discord 어댑터를 직접 개발하여 연동. 기존 텔레그램은 유지하되, 자동화/개발 소통은 Discord로 분리.

## Alternatives Considered

1. **텔레그램 하나로** — 이미 동작 중이지만, 자동 알림과 사람 대화가 섞여 노이즈가 큼. 토픽 기능으로 분리 가능하지만 채널 구조가 Discord보다 제한적.
2. **텔레그램 + git repo 혼합** — 자동화는 git 파일 기반, 사람만 텔레그램. 실시간 알림이 약하고 채널 분리가 안 됨.
3. **텔레그램 + 디스코드 브릿지** — Matterbridge로 양방향 미러링. 추가 인프라 필요하고 메시지 중복 문제.

## Consequences

### 긍정적
- 채널별 역할 분리 (control/dev/review/test/logs/human)
- GitHub 웹훅 네이티브 지원
- 스레드 기능으로 장시간 태스크 관리 용이
- 사업 성장 시 팀원 초대 쉬움

### 부정적
- NanoClaw Discord 어댑터 개발 필요 (현재 미지원)
- Discord 봇 토큰 관리 추가
- Discord 서버 설정/관리 오버헤드
