# General Code Standards

This file contains general coding standards that apply across all contexts.

## Critical Rules (Quick Reference)

| Rule                           | Why                                          |
| ------------------------------ | -------------------------------------------- |
| **No barrel files**            | Implicit deps and circular import problems   |
| **Inline exports only**        | Improves readability and avoids export drift |
| **Function declarations only** | Consistent stack traces and hoisting         |
| **No abbreviations**           | Clarity over brevity                         |
| **Ordered imports**            | Predictable diffs and scanability            |
| **No chained array methods**   | Easier debugging and readability             |

---

## Function Style

**Prefer function declarations over arrow function variables.**

Why: Function declarations are hoisted, more readable, and have clearer `this` binding.

```typescript
// ✅✅ Do this - function declaration
function calculateTotal(items: Array<Item>): number {
	// ...
}

// ❌❌ Don't do this - arrow function variable
const calculateTotal = (items: Array<Item>): number => {
	// ...
};
```

**Exception:** Arrow functions are fine for inline callbacks and React event handlers.

---

## Exports

**Export inline with the declaration. Never collect exports at the bottom of a file.**

```typescript
// ✅✅ Do this - inline exports
export function calculateTotal(items: Array<Item>): number {
	// ...
}

export const QUERY_KEYS = {
	items: ["items"],
} as const;

// ❌❌ Don't do this - export block at the bottom
function calculateTotal(items: Array<Item>): number {
	// ...
}

const QUERY_KEYS = {
	items: ["items"],
} as const;

export { calculateTotal, QUERY_KEYS };
```

---

## Import Organization

Order imports in this sequence, with blank lines between groups:

1. External dependencies (react, @tanstack, libraries)
2. Internal modules (@/lib, @/utils, @/components)
3. Types (import type statements)

```typescript
// ✅✅ Good import organization
import { createAPIFileRoute } from "@tanstack/react-start/api";
import Database from "better-sqlite3";

import { getDatabase } from "@/lib/database";
import { formatDate } from "@/utils/format-date";

import type { Lesson, Course } from "@/lib/types";
```

**Never create or use barrel files (index.ts that re-exports):**

```typescript
// ❌❌ Don't create barrel files like this
// components/index.ts
export { Button } from "./button";
export { Modal } from "./modal";
export { Header } from "./header";

// ❌❌ Don't import from barrel files
import { Button, Modal } from "@/components";

// ✅✅ Import directly from the source file
import { Button } from "@/components/button";
import { Modal } from "@/components/modal";
```

---

## File Naming Conventions

**All files use kebab-case. No exceptions except markdown.**

- ✅ `lesson-focused-mode.tsx`
- ✅ `get-video-embed-url.ts`
- ✅ `create-course-form.tsx`
- ❌ `LessonFocusedMode.tsx`
- ❌ `getVideoEmbedUrl.ts`
- ❌ `CreateCourseForm.tsx`

**Markdown files use ALL CAPS:**

- ✅ `README.md`
- ✅ `CLAUDE.md`
- ✅ `CONTRIBUTING.md`
- ❌ `readme.md`
- ❌ `claude.md`

---

---

## Naming Conventions

**Use descriptive, self-documenting names** - even if they're long.

- ❌ DO NOT abbreviate variable/function names (e.g., `fab`, `btn`, `msg`, `usr`)
- ❌ DO NOT abbreviate callback parameters (e.g., `items.map(i => i.id)`, `users.filter(u => u.isActive)`)
- ✅ USE full descriptive names everywhere (e.g., `createAlarmButton`, `errorMessage`, `currentUser`)
- The only exceptions
  -- Simple loop counters like `i`, `j` in basic for loops
  -- The word parameters abbreviated to params
  -- The word identifier abbreviated to id
  -- Using `(a,b)` function signature for array.sort

```typescript
// ❌❌ Bad - abbreviated variable names
const fab = <TouchableOpacity />;
const usr = getUser();
const msg = "Hello";
const btn = document.getElementById("submit");

// ✅✅ Good - descriptive names
const floatingActionButton = <TouchableOpacity />;
const currentUser = getUser();
const welcomeMessage = "Hello";
const submitButton = document.getElementById("submit");

// ❌❌ Bad - abbreviated callback parameters
items.map(i => i.id)
users.filter(u => u.isActive)
products.forEach(p => console.log(p.name))

// ✅✅ Good - full names even in callbacks
items.map(item => item.id)
users.filter(user => user.isActive)
products.forEach(product => console.log(product.name))
```

---

## Boolean Naming Conventions

**Use consistent prefixes for boolean variables and functions.**

```typescript
// ❌❌ Don't do this - ambiguous boolean names
const loading = true;
const visible = false;

// ✅✅ Do this - clear boolean prefixes
const isLoading = true;
const isVisible = false;
```

**Common boolean prefixes:**

- `is` - State or condition: `isLoading`, `isVisible`, `isActive`, `isValid`
- `has` - Possession or presence: `hasAccess`, `hasPermission`, `hasError`, `hasChildren`
- `should` - Recommendation or intent: `shouldRender`, `shouldUpdate`, `shouldRetry`
- `can` - Ability or permission: `canEdit`, `canDelete`, `canSubmit`
- `will` - Future action: `willRedirect`, `willExpire`, `willUpdate`

---

## No Secrets in Logs

**Never log sensitive information.** Redact or omit secrets, tokens, passwords, and personal data.

```typescript
// ❌❌ Don't do this - logging sensitive data
console.log("User login:", { email: user.email, password: password });
console.log("API request headers:", request.headers);
console.log("Auth token:", token);

// ✅✅ Do this - redact or omit sensitive data
console.log("User login:", { email: user.email, password: "[REDACTED]" });
console.log("API request headers:", { ...request.headers, authorization: "[REDACTED]" });
console.log("Auth token received:", !!token);
```

**What to never log:** Passwords, API keys, tokens, authorization headers, credit card numbers, SSNs, encryption keys, session IDs, personal health information.

---

## Array Iteration Patterns

**Avoid chained array methods and multiple filter passes.** Use explicit `for` loops for better performance and readability.

### No Chained `.filter().map()`

Chaining creates intermediate arrays and iterates multiple times. Use a single loop instead.

```typescript
// ❌❌ Don't do this - creates intermediate array, iterates twice
const activeUserNames = users.filter((user) => !!user.isActive).map((user) => user.name);

// ✅✅ Do this - single pass, explicit logic
const activeUserNames: Array<string> = [];

for (const user of users) {
	if (!user.isActive) {
		continue;
	}
	activeUserNames.push(user.name);
}
```

### No Multiple Filter Passes

Don't iterate the same array multiple times to categorize items.

```typescript
// ❌❌ Don't do this - iterates the array twice
const resources = lessonItems.filter((item) => item.type === ItemType.RESOURCE);
const questions = lessonItems.filter((item) => item.type === ItemType.QUESTION);

// ✅✅ Do this - single pass, categorize in one loop
const resources: Array<LessonItem> = [];
const questions: Array<LessonItem> = [];

for (const item of lessonItems) {
	if (item.type === ItemType.RESOURCE) {
		resources.push(item);
	} else if (item.type === ItemType.QUESTION) {
		questions.push(item);
	}
}
```

### When Simple Array Methods Are OK

Single, simple transformations are fine:

```typescript
// ✅ OK - single method, simple transformation
const userIds = users.map((user) => user.id);

// ✅ OK - single filter with simple condition
const activeUsers = users.filter((user) => user.isActive);
```
