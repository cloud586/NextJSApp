# NextJSApp

## Feature Flags

Feature flags are configured in `.env.local` and control runtime behavior.

| Flag | Value | Used In |
|------|-------|---------|
| `NEXT_PUBLIC_FEATURE_NEW_DASHBOARD` | `true` | [page.tsx](nextjsapp/app/page.tsx) |

### Usage

The flag is checked in [page.tsx](nextjsapp/app/page.tsx#L16-L22):

```tsx
{process.env.NEXT_PUBLIC_FEATURE_NEW_DASHBOARD === "true" ? (
  <h1>To get started with feature flags, edit the page.tsx file.</h1>
) : (
  <h1>To get started, edit the page.tsx file.</h1>
)}
```

To toggle a feature, edit the value in `.env.local` and restart the dev server.
