/**
 * LLM abstraction layer
 *
 * Env vars:
 *   ANTHROPIC_API_KEY   — required for real calls
 *   LLM_MODEL           — optional, defaults to claude-haiku-4-5 (fast + cheap)
 *                         set to "claude-sonnet-4-5" for higher quality
 *   MOCK_LLM            — if "true", returns deterministic fixture (for Gus / CI)
 */

import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_MODEL = "claude-haiku-4-5";

const SYSTEM_PROMPT = `You are a changelog generator. Given raw git log output, produce a polished, human-readable changelog.

Rules:
- Categorize commits into: features, bugFixes, breakingChanges, other
- Use clear, non-technical language where possible  
- Skip merge commits, version bumps, and dependency updates (put them in "other" only if notable)
- Keep entries concise — one line each, no trailing periods
- Commits with "!" (e.g. "feat!:") or "BREAKING CHANGE:" go in breakingChanges
- If a category has no entries, return an empty array — do NOT omit the key
- Output ONLY valid JSON — no markdown fences, no extra text

Required output schema:
{
  "sections": {
    "features": ["string"],
    "bugFixes": ["string"],
    "breakingChanges": ["string"],
    "other": ["string"]
  },
  "summary": "One sentence summary of this release (plain English, no jargon)"
}`;

// Deterministic mock response for testing
const MOCK_RESPONSE = {
  sections: {
    features: [
      "Add user authentication with JWT tokens",
      "Dark mode support across all pages",
    ],
    bugFixes: [
      "Fix null pointer crash in payment processor",
      "Fix mobile navigation menu overlapping content",
      "Correct tax calculation for EU customers",
    ],
    breakingChanges: [
      "Rename API endpoint from /users to /accounts — update your clients",
    ],
    other: [
      "Upgrade dependencies to latest versions",
      "Extract shared button component for reuse",
      "Update README with setup instructions",
    ],
  },
  summary:
    "This release adds authentication and dark mode, fixes several bugs, and renames the users endpoint.",
};

export interface LLMResult {
  sections: {
    features: string[];
    bugFixes: string[];
    breakingChanges: string[];
    other: string[];
  };
  summary: string;
  mock?: boolean;
}

export async function generateChangelog(gitLog: string): Promise<LLMResult> {
  // Mock mode — deterministic, no API call
  if (process.env.MOCK_LLM === "true") {
    // Slight delay to simulate real latency in tests
    await new Promise((r) => setTimeout(r, 80));
    return { ...MOCK_RESPONSE, mock: true };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local or set MOCK_LLM=true for testing."
    );
  }

  const model = process.env.LLM_MODEL || DEFAULT_MODEL;
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model,
    max_tokens: 2048,
    temperature: 0.3,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Git log:\n\`\`\`\n${gitLog.trim()}\n\`\`\`\n\nGenerate the changelog JSON now.`,
      },
    ],
  });

  const raw =
    message.content[0]?.type === "text" ? message.content[0].text : "";

  // Parse and validate
  let parsed: LLMResult;
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    console.error("Anthropic returned non-JSON:", raw);
    throw new Error(`Failed to parse LLM response: ${raw.slice(0, 200)}`);
  }

  // Ensure all section keys exist (defensive)
  const sections = parsed.sections ?? {};
  return {
    sections: {
      features: sections.features ?? [],
      bugFixes: sections.bugFixes ?? [],
      breakingChanges: sections.breakingChanges ?? [],
      other: sections.other ?? [],
    },
    summary: parsed.summary ?? "No summary provided.",
  };
}
