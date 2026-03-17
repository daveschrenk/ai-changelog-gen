# /api/generate — API Reference

## Endpoint

```
POST /api/generate
Content-Type: application/json
```

## Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `gitLog` | string | ✅ | Raw git log text (e.g. output of `git log --oneline`) |
| `version` | string | ❌ | Version label for the release (default: `"Unreleased"`) |
| `repoName` | string | ❌ | Repository name for the changelog header |

### Example Request

```json
{
  "gitLog": "abc1234 feat: add user authentication\ndef5678 fix: resolve payment null pointer\nghi9012 feat!: rename /users to /accounts",
  "version": "v2.1.0",
  "repoName": "my-app"
}
```

## Success Response (200)

```json
{
  "changelog": "# my-app — v2.1.0 (2026-03-17)\n\n> ...\n\n## ⚠️ Breaking Changes\n...",
  "sections": {
    "features": ["Add user authentication"],
    "bugFixes": ["Resolve null pointer in payment processor"],
    "breakingChanges": ["Rename /users endpoint to /accounts"],
    "other": []
  },
  "version": "v2.1.0",
  "generatedAt": "2026-03-17T20:00:00.000Z"
}
```

## Error Responses

| Status | Condition | Response |
|--------|-----------|----------|
| `400` | Missing or empty `gitLog` | `{ "error": "gitLog is required..." }` |
| `400` | `gitLog` > 50,000 chars | `{ "error": "gitLog too large..." }` |
| `429` | Free tier limit reached (5/month) | `{ "error": "Free tier limit reached...", "upgradeUrl": "..." }` |
| `500` | LLM error or parse failure | `{ "error": "Internal server error" }` |

## Paid Tier Header (temporary)

While Stripe integration is pending, pass this header to bypass the free tier gate:

```
x-paid-user: true
```

This will be replaced with a proper session-based auth check post-Stripe integration.

## Output Structure

The `changelog` field is Markdown with these sections (only present if non-empty):

- `⚠️ Breaking Changes`
- `✨ Features`
- `🐛 Bug Fixes`
- `🔧 Other Changes`

## Tips for Gus (Test Notes)

- Test with empty `gitLog` → expect 400
- Test with `gitLog` of 50,001 chars → expect 400
- Test with only merge commits → expect empty sections (graceful)
- Test `version` and `repoName` appear correctly in `changelog` output
- Test 429 after 5 requests from same IP (in-memory, resets on server restart)
- Test `x-paid-user: true` header bypasses 429
- Validate `sections` keys always present even if empty arrays
- Validate `generatedAt` is valid ISO 8601
