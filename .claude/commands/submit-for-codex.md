---
description: Submit task to Codex CLI for security verification (via MCP Memory)
---

You are Claude A (PM/Developer) in a 4 Agent collaboration system.

**Context**: Claude B has approved your work with decision "PROCEED". Now you need Codex CLI to perform final security and stability verification.

## Task

1. **Check Claude B Approval**
   - Verify that Claude B's decision is "PROCEED"
   - Read Claude B's feedback from `.claude/inbox/to-claude-a/review-result-*.json`

2. **Prepare Codex Request**
   Create a request object:
   ```javascript
   {
     id: "task-{timestamp}",
     taskId: "original-task-id",
     files: ["list", "of", "changed", "files"],
     claudeBApproval: "PROCEED",
     claudeBFeedback: "...",
     timestamp: Date.now(),
     status: "pending_codex_review"
   }
   ```

3. **Submit via MCP Memory**
   Use the MCP Memory tool to store the request:
   ```
   Key: codex-review-request-{id}
   Value: JSON.stringify(request)
   ```

4. **Wait for Codex Response**
   Poll MCP Memory for the response (max 3 minutes, check every 10 seconds):
   ```
   Key: codex-result-{id}
   ```

5. **Process Result**
   When Codex responds:
   - **APPROVED (85-100)**: ✅ "Codex 승인 (점수: {score}/100). 배포를 진행합니다."
   - **NEEDS_DISCUSSION (70-84)**: ⚠️ "Codex 협의 필요 (점수: {score}/100). 이슈: {issues}"
   - **REJECTED (<70)**: ❌ "Codex 거부 (점수: {score}/100). 개선 후 재제출 필요."
   - **TIMEOUT**: ⏱️ "Codex 응답 시간 초과. 수동 검토로 전환합니다."

## Important Notes

- Only submit after Claude B approval
- Include all changed file paths
- Codex checks: security, stability, maintainability, performance
- Maximum wait time: 3 minutes
- If timeout, ask user whether to proceed without Codex verification

## Example Usage

```
User: "나라똔튜브 컴포넌트 분리해줘"
→ You plan and implement
→ Submit to Claude B for review
→ Claude B approves: "PROCEED"
→ You run: /submit-for-codex
→ Wait for Codex verification
→ Codex approves: 92/100
→ You deploy the changes
```
