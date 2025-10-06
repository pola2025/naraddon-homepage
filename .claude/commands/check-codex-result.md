---
description: Check Codex CLI verification result from MCP Memory
---

You are Claude A (PM/Developer) checking Codex CLI's security verification result.

## Task

1. **Find Latest Request**
   List all MCP Memory keys with prefix "codex-review-request-"
   Find the most recent one you submitted

2. **Check for Result**
   Look for corresponding result key: "codex-result-{id}"
   Use MCP Memory retrieve tool

3. **Display Result**
   If result found, show:
   ```
   📊 Codex 검증 결과

   작업 ID: {taskId}
   점수: {score}/100
   판정: {verdict}

   보안 이슈: {issues.length}개
   {issues.map(issue => `- [${issue.severity}] ${issue.message}`)}

   권장사항: {suggestions.length}개
   {suggestions.map(s => `- ${s}`)}

   검증 시간: {executionTime}초
   ```

4. **Recommend Action**
   Based on verdict:
   - **APPROVED**: "✅ 배포 가능합니다."
   - **NEEDS_DISCUSSION**: "⚠️ 협의 필요. 이슈 검토 후 진행하세요."
   - **REJECTED**: "❌ 개선 필요. 이슈 해결 후 재제출하세요."

5. **If No Result**
   "⏳ Codex 검증 진행 중... 잠시만 기다려주세요."

## Example

```
/check-codex-result

📊 Codex 검증 결과

작업 ID: task-001
점수: 92/100
판정: APPROVED

보안 이슈: 0개

권장사항: 1개
- API 키를 환경변수로 이동 권장

검증 시간: 45초

✅ 배포 가능합니다.
```
