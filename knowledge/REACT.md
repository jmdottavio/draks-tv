# React Coding Standards

This file contains standards for React components, hooks, and state management.

## Critical Rules (Quick Reference)

| Rule                                               | Why                                                        |
| -------------------------------------------------- | ---------------------------------------------------------- |
| **Never call hooks conditionally**                 | Hooks must be called in same order every render            |
| **No `setState` inside `useEffect`**               | Causes render cascades; use data fetching libraries        |
| **Avoid `useEffect` - derive state instead**       | Effects cause unnecessary renders                          |
| **Avoid `useState` for derived data**              | Compute directly from props/queries                        |
| **Scope hooks to components that need them**       | Keeps parent simple; related logic stays together          |
| **Extract components that own behavior**           | Components need hooks, state, handlers, or reuse to exist  |
| **Don't extract components without behavior**      | Wrapper components add indirection without purpose         |
| **Use early returns to flatten structure**         | Avoids deep nesting and ternary chains                     |
| **Use stable keys in lists**                       | Never use array index as key                               |
| **No ternaries for conditional JSX**               | Use separate `&&` conditions                               |
| **Accessibility: semantic HTML, keyboard, labels** | All interactive elements must be accessible                |
| **Prefer controlled form inputs**                  | Easier to validate, reset, synchronize                     |
| **Define static functions outside components**     | Avoid recreation on every render                           |
| **No inline objects/arrays in JSX props**          | Creates new references; breaks memoization                 |
| **If loading, return null**                        | Simple pattern; avoid duplicating layout in loading states |

---

## Never Call Hooks Conditionally

Hooks must be called in the exact same order on every render. Never place hooks after early returns or inside conditionals.

```tsx
// ❌❌ Don't do this - hook after early return
function UserProfile({ userId }: { userId: number | null }) {
	if (!userId) {
		return <div>No user selected</div>;
	}

	const [user, setUser] = useState<User | null>(null); // BREAKS RULES OF HOOKS
}

// ✅✅ Do this - hooks first, then conditionals
function UserProfile({ userId }: { userId: number | null }) {
	const [user, setUser] = useState<User | null>(null);

	if (!userId) {
		return <div>No user selected</div>;
	}
}
```

---

## Never Set State Inside `useEffect`

Setting state inside useEffect causes render cascades. Use data fetching libraries (React Query, SWR) instead.

```tsx
// ❌❌ Don't do this - setState inside useEffect
useEffect(() => {
	setIsLoading(true);
	fetch(`/api/users/${userId}`).then((data) => {
		setUser(data);
		setIsLoading(false);
	});
}, [userId]);

// ✅✅ Do this - use a data fetching library
const { data: user, isLoading } = useQuery({
	queryKey: ["user", userId],
	queryFn: () => fetch(`/api/users/${userId}`).then((response) => response.json()),
});
```

---

## Avoid `useEffect` - Derive State Instead

`useEffect` often indicates you're synchronizing state that could be computed directly. Prefer deriving values from your data source.

```tsx
// ❌❌ Don't do this - useEffect to transform data
function UserList({ users }: { users: Array<User> }) {
	const [sortedUsers, setSortedUsers] = useState<Array<User>>([]);

	useEffect(() => {
		const sorted = [...users].sort((a, b) => a.name.localeCompare(b.name));
		setSortedUsers(sorted);
	}, [users]);

	return (
		<ul>
			{sortedUsers.map((user) => (
				<li key={user.id}>{user.name}</li>
			))}
		</ul>
	);
}

// ✅✅ Do this - derive directly from data
function UserList({ users }: { users: Array<User> }) {
	const sortedUsers = [...users].sort((a, b) => a.name.localeCompare(b.name));

	return (
		<ul>
			{sortedUsers.map((user) => (
				<li key={user.id}>{user.name}</li>
			))}
		</ul>
	);
}
```

---

## Avoid `useState` for Derived Data

If a value can be computed from props, other state, or query data, compute it directly instead of storing it in state.

```tsx
// ❌❌ Don't do this - useState for derived data
function ProductList({ products }: { products: Array<Product> }) {
	const [filteredProducts, setFilteredProducts] = useState<Array<Product>>([]);
	const [searchTerm, setSearchTerm] = useState("");

	useEffect(() => {
		setFilteredProducts(products.filter((product) => product.name.includes(searchTerm)));
	}, [products, searchTerm]);

	return (
		<div>
			{filteredProducts.map((product) => (
				<ProductCard key={product.id} product={product} />
			))}
		</div>
	);
}

// ✅✅ Do this - compute directly
function ProductList({ products }: { products: Array<Product> }) {
	const [searchTerm, setSearchTerm] = useState("");

	const filteredProducts: Array<Product> = [];
	for (const product of products) {
		if (product.name.includes(searchTerm)) {
			filteredProducts.push(product);
		}
	}

	return (
		<div>
			{filteredProducts.map((product) => (
				<ProductCard key={product.id} product={product} />
			))}
		</div>
	);
}
```

---

## Scope Hooks to Components That Need Them

Move hooks into the components that actually use them. Don't define hooks in a parent and pass results down.

```tsx
// ❌❌ Don't do this - hook in parent, logic scattered
function LessonPage({ lessonId }: { lessonId: number }) {
	const queryClient = useQueryClient();
	const router = useRouter();

	const deleteMutation = useMutation({
		mutationFn: () => deleteLesson(lessonId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["lessons"] });
			router.push("/courses");
		},
	});

	return (
		<div>
			<LessonContent lessonId={lessonId} />
			<button onClick={() => deleteMutation.mutate()}>Delete</button>
		</div>
	);
}

// ✅✅ Do this - hook in component that owns the behavior
function LessonPage({ lessonId }: { lessonId: number }) {
	return (
		<div>
			<LessonContent lessonId={lessonId} />
			<LessonDeleteButton lessonId={lessonId} />
		</div>
	);
}

function LessonDeleteButton({ lessonId }: { lessonId: number }) {
	const queryClient = useQueryClient();
	const router = useRouter();

	const deleteMutation = useMutation({
		mutationFn: () => deleteLesson(lessonId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["lessons"] });
			router.push("/courses");
		},
	});

	function handleDelete() {
		const shouldDelete = confirm("Are you sure you want to delete this lesson?");
		if (shouldDelete) {
			deleteMutation.mutate();
		}
	}

	return (
		<button onClick={handleDelete} disabled={deleteMutation.isPending}>
			{deleteMutation.isPending ? "Deleting..." : "Delete Lesson"}
		</button>
	);
}
```

**Benefits:** Parent component stays simple. Related logic (mutation, confirmation, navigation) stays together. Hook only runs when `LessonDeleteButton` mounts.

---

## When to Extract Components

**Extract a component when:**

1. It owns behavior (hooks, mutations, handlers, local state)
2. The same JSX structure is duplicated across states (loading/error/success)
3. It will be reused in multiple places
4. Would be a large (50+ line) pure component
5. If indentation is getting to be too much (lenient with React -> 8+ tabs)

```tsx
// ✅ Good extraction - component owns behavior
function ModeToggleButton({ currentMode }: { currentMode: LessonMode }) {
	const router = useRouter();

	function handleToggle() {
		const newMode = currentMode === LessonMode.STUDY ? LessonMode.EDIT : LessonMode.STUDY;
		const url = new URL(window.location.href);
		url.searchParams.set("mode", newMode);
		router.push(url.pathname + url.search);
	}

	const buttonText = currentMode === LessonMode.STUDY ? "Edit" : "Study";

	return <button onClick={handleToggle}>{buttonText}</button>;
}

// ✅ Good extraction - reusable across loading/error/success states
function PageHeader({ title, backLink }: { title: string; backLink: string }) {
	return (
		<div className="flex items-center justify-between py-4">
			<Link href={backLink}>Back</Link>
			<h1>{title}</h1>
		</div>
	);
}
```

---

## Don't Extract Components Without Behavior

**Don't extract a component just to:**

- Shorten a file
- Organize by "visual sections"

**Ask:** Does this component have its own state, hooks, or handlers? Will it be reused? If no to both, probably don't extract.

```tsx
// ❌❌ Don't do this - wrapper with no behavior, not reused
function LessonTitle({ title }: { title: string }) {
	return <h1 className="text-xl font-semibold">{title}</h1>;
}

function LessonDescription({ description }: { description: string }) {
	return <p className="text-gray-600">{description}</p>;
}

function LessonPage({ lesson }: { lesson: Lesson }) {
	return (
		<div>
			<LessonTitle title={lesson.title} />
			<LessonDescription description={lesson.description} />
		</div>
	);
}

// ✅✅ Do this - inline JSX when there's no behavior
function LessonPage({ lesson }: { lesson: Lesson }) {
	return (
		<div>
			<h1 className="text-xl font-semibold">{lesson.title}</h1>
			<p className="text-gray-600">{lesson.description}</p>
		</div>
	);
}
```

**Exception:** Deep nesting (4+ levels of indentation) can justify extraction for readability, even without behavior.

---

## Use Early Returns to Flatten Structure

Use early returns instead of ternaries or deeply nested conditionals at the end of components.

```tsx
// ❌❌ Don't do this - ternary at end creates nesting
function LessonPage({ lesson }: { lesson: Lesson }) {
	const [currentMode, setCurrentMode] = useState(LessonMode.STUDY);

	return (
		<div>
			<PageHeader title={lesson.title} />
			{currentMode === LessonMode.EDIT ? (
				<LessonEditMode lesson={lesson} />
			) : (
				<LessonStudyMode lesson={lesson} />
			)}
		</div>
	);
}

// ✅✅ Do this - early return for flat structure
function LessonPage({ lesson }: { lesson: Lesson }) {
	const [currentMode, setCurrentMode] = useState(LessonMode.STUDY);

	if (currentMode === LessonMode.STUDY) {
		return (
			<div>
				<PageHeader title={lesson.title} />
				<LessonStudyMode lesson={lesson} />
			</div>
		);
	}

	return (
		<div>
			<PageHeader title={lesson.title} />
			<LessonEditMode lesson={lesson} />
		</div>
	);
}
```

---

## Use Stable Keys in Lists

Always use unique, stable identifiers as keys. Never use array indices as keys unless the list is static and will never reorder.

```tsx
// ✅✅ Do this - stable ID as key
function TodoList({ todos }: { todos: Array<Todo> }) {
	return (
		<ul>
			{todos.map((todo) => (
				<li key={todo.id}>{todo.text}</li>
			))}
		</ul>
	);
}
```

---

## No Ternaries for Conditional JSX

Use separate `&&` conditions instead of ternaries when conditionally rendering JSX.

```tsx
// ❌❌ Don't do this - ternary for conditional display
{
	lessons.length > 0 ? <LessonList lessons={lessons} /> : <EmptyState />;
}

// ✅✅ Do this - separate conditions
{
	lessons.length === 0 && <EmptyState />;
}
{
	lessons.length > 0 && <LessonList lessons={lessons} />;
}
```

---

## Accessibility Baseline

**All interactive elements must be accessible.**

- **Keyboard accessibility:** Use `<button>` elements, not `<div onClick>`. If custom elements are needed, add `role`, `tabIndex`, and keyboard handlers.
- **Semantic HTML:** Use `<nav>`, `<main>`, `<article>`, `<button>`, `<a>` instead of divs with roles.
- **Labels for inputs:** Every input must have a `<label>` with `htmlFor` or `aria-label`.
- **Alt text for images:** All images must have `alt` attributes (descriptive text or empty string for decorative images).
- **Focus management:** Manage focus for modals and dialogs.

---

## Prefer Controlled Components for Form Inputs

Controlled components (where React state drives the input value) are easier to validate, reset, and synchronize.

```tsx
// ❌❌ Don't do this - uncontrolled input with ref
const inputRef = useRef<HTMLInputElement>(null);
const searchTerm = inputRef.current?.value;

// ✅✅ Do this - controlled input
const [searchTerm, setSearchTerm] = useState("");
<input type="text" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />;
```

---

## Define Static Functions Outside Components

Functions that don't depend on props, state, or other component values should be defined outside the component to avoid recreation on every render.

```tsx
// ❌❌ Don't do this - utility function inside component
function PriceDisplay({ price }: { price: number }) {
	function formatCurrency(amount: number): string {
		return `$${amount.toFixed(2)}`;
	}
	return <span>{formatCurrency(price)}</span>;
}

// ✅✅ Do this - utility function outside component
function formatCurrency(amount: number): string {
	return `$${amount.toFixed(2)}`;
}

function PriceDisplay({ price }: { price: number }) {
	return <span>{formatCurrency(price)}</span>;
}
```

**Same applies to constants:** Define constant arrays/objects outside components.

---

## No Inline Objects or Arrays in JSX Props

**Never pass inline object or array literals as props.** They create new references on every render, breaking memoization.

```tsx
// ❌❌ Don't do this - inline object creates new reference every render
function UserProfile({ user }: { user: User }) {
	return <UserCard user={user} style={{ padding: 20, margin: 10 }} />;
}

// ✅✅ Do this - define objects outside component
const USER_CARD_STYLE = { padding: 20, margin: 10 };

function UserProfile({ user }: { user: User }) {
	return <UserCard user={user} style={USER_CARD_STYLE} />;
}
```

**Exception:** Inline objects are acceptable when the value depends on component state or props:

```tsx
// ✅ OK - style depends on state
function Alert({ isVisible }: { isVisible: boolean }) {
	return <div style={{ opacity: isVisible ? 1 : 0 }}>Alert</div>;
}
```

---

## Loading States

For page-level loading, return null. Avoid duplicating layout structure in loading skeletons.

```tsx
function LessonPage({ params }: { params: { lessonId: string } }) {
	const { data, isLoading, error } = useQuery({
		queryKey: ["lessons", params.lessonId],
		queryFn: () => fetchLesson(params.lessonId),
	});

	if (isLoading) {
		return null;
	}

	if (error || !data) {
		return <ErrorState />;
	}

	return <LessonContent lesson={data} />;
}
```
