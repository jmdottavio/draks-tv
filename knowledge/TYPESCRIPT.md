# TypeScript Standards

This file contains TypeScript-specific coding standards.

## Critical Rules (Quick Reference)

| Rule                                      | Why                                                         |
| ----------------------------------------- | ----------------------------------------------------------- |
| **No `any` type**                         | Define proper types; defeats TypeScript's purpose           |
| **Prefer `unknown` over `any`**           | Forces explicit type narrowing for untrusted inputs         |
| **Avoid type assertions (`as`)**          | Only at boundaries with validation; document why            |
| **Result pattern for errors**             | Return `T \| Error` instead of throwing in domain logic     |
| **No nested ternaries**                   | Always use helper variables                                 |
| **No ternaries in function arguments**    | Extract to helper variables first                           |
| **No ternaries with complex expressions** | Use helper variables when condition or branches are complex |
| **No non-null assertions (`!`)**          | Hides nullability problems; handle null explicitly          |
| **Use `satisfies` for object validation** | Validates shape while preserving literal types              |
| **Use `Array<T>` not `T[]`**              | Generic syntax is more readable and consistent              |

---

## No `any` Type

Define proper types. Only use `any` as a last resort for extremely complex third-party types.

```typescript
// ❌❌ Don't do this
const userResult = db.prepare(FETCH_USER_SQL).get(userId) as any;

// ✅✅ Do this
type User = { id: number; name: string; email: string };
const userResult = db.prepare(FETCH_USER_SQL).get(userId) as User;
```

---

## Prefer `unknown` Over `any`

**Use `unknown` for untrusted inputs and narrow with explicit checks.**

`unknown` forces you to verify the type before using it, preventing runtime errors.

```typescript
// ❌❌ Don't do this - any bypasses all type checking
function parseUserResponse(response: any) {
	return response.data.user.name;
}

// ✅✅ Do this - unknown with validation
function parseUserResponse(response: unknown) {
	if (!isUser(response)) {
		return new Error("Invalid user data");
	}
	return response;
}
```

**Common use cases:** Network responses, database query results, user input, JSON.parse results, third-party library callbacks.

---

## Avoid Type Assertions (`as`)

**Avoid type assertions except at system boundaries.** Document why when you must use them.

```typescript
// ❌❌ Don't do this - assertion without validation
const users = (await response.json()) as Array<User>;

// ✅✅ Do this - validate at boundary
const data = await response.json();
const users = validateUsers(data);
if (users instanceof Error) {
	return;
}
```

**When assertions are acceptable:** At system boundaries after explicit validation, when interfacing with poorly-typed third-party libraries.

---

## Result Pattern for Error Handling

**For domain logic and library functions, return `T | Error` instead of throwing.**

```typescript
// ❌❌ Don't do this - throwing in domain logic
function parseUserId(input: string) {
	if (isNaN(parseInt(input, 10))) {
		throw new Error("Invalid user ID");
	}
	return parseInt(input, 10);
}

// ✅✅ Do this - return T | Error
function parseUserId(input: string) {
	const id = parseInt(input, 10);
	if (isNaN(id)) {
		return new Error("Invalid user ID");
	}
	return id;
}

// Usage
const result = parseUserId(userInput);
if (result instanceof Error) {
	return;
}
const userId = result;
```

---

## No Nested Ternaries - Ever

Always use helper variables. This applies everywhere, including JSX.

```typescript
// ❌❌ Don't nest ternaries
const isCorrect = answer.isCorrect === null ? null : answer.isCorrect === 1 ? true : false;

// ✅✅ Use helper variables
let isCorrect: boolean | null = null;

if (answer.isCorrect !== null) {
	isCorrect = answer.isCorrect === 1;
}
```

---

## No Ternaries Inside Function Arguments

Extract values to helper variables before passing to functions.

```typescript
// ❌❌ Don't do this
const answer = db.prepare(sql).get(body.isCorrect ? 1 : 0, id);

// ✅✅ Do this
let isCorrectInteger = 0;

if (body.isCorrect) {
	isCorrectInteger = 1;
}

const answer = db.prepare(sql).get(isCorrectInteger, id);
```

---

## No Ternaries with Complex Expressions

Simple ternaries like `isActive ? "yes" : "no"` are fine. But when the condition or branches involve complex expressions (function calls, chained methods, database queries, etc.), use helper variables instead.

```typescript
// ❌❌ Don't do this - complex branches buried in ternary
const [resourcesData, questionsData] = await Promise.all([
	resourceIds.length > 0
		? db.select().from(resources).where(inArray(resources.id, resourceIds))
		: Promise.resolve([]),
	questionIds.length > 0
		? db.select().from(questions).where(inArray(questions.id, questionIds))
		: Promise.resolve([]),
]);

// ❌❌ Don't do this - complex condition and branch
const discount =
	user.purchases.filter((p) => p.status === "completed").length > 5
		? calculateLoyaltyDiscount(user, cart.total)
		: 0;

// ✅✅ Do this - extract to helper variables
let resourcesQuery = Promise.resolve([]);
if (resourceIds.length > 0) {
	resourcesQuery = db.select().from(resources).where(inArray(resources.id, resourceIds));
}

let questionsQuery = Promise.resolve([]);
if (questionIds.length > 0) {
	questionsQuery = db.select().from(questions).where(inArray(questions.id, questionIds));
}

const [resourcesData, questionsData] = await Promise.all([resourcesQuery, questionsQuery]);

// ✅✅ Do this - clear and readable
const completedPurchases = user.purchases.filter((purchase) => purchase.status === "completed");
const isLoyalCustomer = completedPurchases.length > 5;

let discount = 0;
if (isLoyalCustomer) {
	discount = calculateLoyaltyDiscount(user, cart.total);
}
```

**Rule of thumb:** If the ternary doesn't fit on one short line with simple values, use a helper variable.

---

## No Non-Null Assertions (`!`)

**Never use non-null assertions.** They hide real nullability problems and defeat TypeScript's strictness.

```typescript
// ❌❌ Don't do this - assertion hides potential null
const user = users.find((user) => user.id === userId)!;
console.log(user.name);

// ✅✅ Do this - handle null explicitly
const user = users.find((user) => user.id === userId);

if (!user) {
	console.error(`User ${userId} not found`);
	return;
}

console.log(user.name);
```

```typescript
// ❌❌ Don't do this - DOM assertion can fail
const button = document.getElementById("submit")!;
button.addEventListener("click", handleClick);

// ✅✅ Do this - check existence first
const button = document.getElementById("submit");

if (!button) {
	console.error("Submit button not found");
	return;
}

button.addEventListener("click", handleClick);
```

---

## Use `satisfies` for Object Validation

**Use `satisfies` to validate object shapes while preserving literal types.**

```typescript
// ❌❌ Don't do this - loses literal types
const config: Record<string, string> = {
	apiUrl: "https://api.example.com",
	timeout: "5000",
};
// config.apiUrl is type 'string', not the literal

// ✅✅ Do this - preserves literal types
const config = {
	apiUrl: "https://api.example.com",
	timeout: "5000",
} satisfies Record<string, string>;
// config.apiUrl is type 'https://api.example.com'
```

---

## Use `Array<T>` Syntax

Always use `Array<T>` instead of `T[]` for array types. The generic syntax is more readable and consistent with other generic types.

```typescript
// ❌❌ Don't do this
const users: User[] = [];
function getIds(items: Item[]): number[] {
	// ...
}

// ✅✅ Do this
const users: Array<User> = [];
function getIds(items: Array<Item>): Array<number> {
	// ...
}
```
