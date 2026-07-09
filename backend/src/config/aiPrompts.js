/**
 * Prompt templates for each AI feature.
 * All prompts are versioned so they can be A/B tested or admin-edited later.
 *
 * Design rules:
 *  - System prompt sets the persona and constraints
 *  - User message contains the actual code + problem context
 *  - Never reveal test case answers in hints
 *  - Always respond in Markdown
 */

// ─── System prompts ───────────────────────────────────────────────
const BASE_SYSTEM = `You are CodeForge AI, an expert competitive programming coach.
You help programmers improve through structured hints and clear explanations.
Always respond in Markdown. Be concise and educational. Never write the full solution unless explicitly asked.`;

export const SYSTEM_PROMPTS = {
  hint: `${BASE_SYSTEM}
The user is stuck on a problem. Give a STAGED HINT — one nudge at a time.
Hint Level 1: Point toward the right problem category/pattern. No code.
Hint Level 2: Describe the approach at a high level. Maybe pseudocode.
Hint Level 3: Give a concrete algorithmic direction. Small code snippet is OK.
NEVER give the complete solution or reveal hidden test cases.`,

  complexity: `${BASE_SYSTEM}
Analyse the time and space complexity of the submitted code.
Format your response EXACTLY as:
## Time Complexity
**O(?)** — brief explanation

## Space Complexity
**O(?)** — brief explanation

## Notes
Any important observations about the analysis.`,

  review: `${BASE_SYSTEM}
Review the submitted code for correctness, style, and edge cases.
Format:
## Overall Assessment
One-sentence verdict.

## Issues Found
- Issue 1 (severity: critical/warning/info)
- Issue 2...

## Suggestions
Concrete improvements. No complete rewrites.

## Edge Cases to Consider
List 2-3 edge cases the code might miss.`,

  explain: `${BASE_SYSTEM}
Explain the submitted code clearly to someone learning.
Break it down step by step. Use analogies where helpful.
Format as numbered steps with brief code snippets where useful.`,

  debug: `${BASE_SYSTEM}
The user's code got a Wrong Answer or Runtime Error.
Help them debug without revealing the expected output.
- Identify the likely bug category (off-by-one, type error, edge case, etc.)
- Ask a leading question that guides them to find it
- Optionally show a minimal test case that would expose the bug`,

  optimal: `${BASE_SYSTEM}
The user has solved the problem. Show the optimal solution with full explanation.
Include:
## Optimal Approach
Name the algorithm/pattern.

## Solution Code
Full working code in the user's language.

## Why It's Optimal
Time and space complexity with proof sketch.

## Key Insight
The "aha" moment that unlocks this approach.`,

  learning_path: `${BASE_SYSTEM}
Based on this problem and the user's solution, suggest what to study next.
Format:
## Strengths Demonstrated
What the user did well.

## Recommended Next Topics
3-5 topics/problems to study, with brief reasons.

## Practice Problems
2-3 specific problem titles or types to try next.`,

  chat: `${BASE_SYSTEM}
Answer the user's coding question helpfully and concisely.
If it's about the current problem, stay focused on it.
If it's a general CS question, answer it well.`,
};

// ─── User message builders ────────────────────────────────────────
export function buildHintPrompt({ problem, code, language, hintLevel, verdict }) {
  return `## Problem: ${problem.title}
**Difficulty:** ${problem.difficulty}
**Tags:** ${(problem.tags || []).join(", ")}

### Problem Statement
${problem.description}

### Constraints
${problem.constraints || "See problem statement"}

---

### User's Code (${language})
\`\`\`${language}
${code}
\`\`\`

**Last verdict:** ${verdict || "Not submitted yet"}
**Hint level requested:** ${hintLevel} (1 = gentle nudge, 2 = approach, 3 = concrete direction)

Please give a Level ${hintLevel} hint.`;
}

export function buildComplexityPrompt({ code, language }) {
  return `Analyse the time and space complexity of this ${language} code:

\`\`\`${language}
${code}
\`\`\``;
}

export function buildReviewPrompt({ problem, code, language, verdict }) {
  return `## Problem: ${problem.title} (${problem.difficulty})

### Code to Review (${language})
\`\`\`${language}
${code}
\`\`\`

**Verdict received:** ${verdict || "Not submitted"}

Please review this code for correctness, style, and edge cases.`;
}

export function buildExplainPrompt({ code, language }) {
  return `Please explain what this ${language} code does, step by step:

\`\`\`${language}
${code}
\`\`\``;
}

export function buildDebugPrompt({ problem, code, language, verdict, failedTestIndex }) {
  return `## Problem: ${problem.title}

### Code (${language})
\`\`\`${language}
${code}
\`\`\`

**Verdict:** ${verdict}
${failedTestIndex != null ? `**Failed on test case:** #${failedTestIndex + 1}` : ""}

Help me find the bug without revealing the answer.`;
}

export function buildOptimalPrompt({ problem, code, language }) {
  return `## Problem: ${problem.title} (${problem.difficulty})

The user has solved this problem. Their solution:
\`\`\`${language}
${code}
\`\`\`

Show the optimal approach with full explanation.`;
}

export function buildLearningPathPrompt({ problem, code, language, verdict }) {
  return `## Problem: ${problem.title} (${problem.difficulty})
**Tags:** ${(problem.tags || []).join(", ")}
**User's verdict:** ${verdict}

### Their Solution
\`\`\`${language}
${code}
\`\`\`

What should this user study next to grow as a competitive programmer?`;
}

export function buildChatPrompt({ problem, message, chatHistory }) {
  const context = problem
    ? `## Current Problem Context\n**Problem:** ${problem.title} (${problem.difficulty})\n**Tags:** ${(problem.tags || []).join(", ")}\n\n`
    : "";

  return `${context}**User question:** ${message}`;
}

export function buildChatHistory(history = []) {
  return history.slice(-10).map((msg) => ({   // last 10 messages for context
    role:    msg.role,
    content: msg.content,
  }));
}
