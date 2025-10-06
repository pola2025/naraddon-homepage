---
description: [Claude A] Check for review results from Claude B
---

Check `.claude/inbox/to-claude-a/` for review results.

For each review file:
1. Read the review JSON
2. Show the decision and feedback to the user
3. If approved: Ask user for confirmation to proceed
4. If rejected: Show feedback and stop
5. If needs_changes: Show suggestions and ask user how to proceed

After handling, delete the review file from to-claude-a folder.
