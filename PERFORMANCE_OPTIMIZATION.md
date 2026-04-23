# Performance Optimization Guide

## useCallback: When to Use It

### ❌ Don't Use useCallback Here (Premature Optimization)

```tsx
// Simple state toggle - React handles this efficiently
<button onClick={() => setOpen(!open)}>Toggle</button>

// One-off handler not passed to children
<button onClick={() => handleSubmit()}>Submit</button>

// Handler in non-performance-critical component
<div onClick={() => navigate('/home')}>Home</div>
```

**Why?** React is extremely fast at handling these simple inline functions. The overhead of useCallback (creating dependencies array, memoization check) can be **slower** than just creating a new function.

### ✅ Do Use useCallback Here (Real Performance Gains)

```tsx
// 1. Callback passed to memoized child component
const MemoizedChild = React.memo(ChildComponent);

function Parent() {
  const [count, setCount] = useState(0);
  
  // Without useCallback, ChildComponent re-renders every time Parent renders
  const handleClick = useCallback(() => {
    doSomething();
  }, []); // Dependencies array - only recreate if these change
  
  return <MemoizedChild onClick={handleClick} />;
}

// 2. Callback used in useEffect dependencies
function Component({ userId }) {
  const fetchUser = useCallback(async () => {
    const response = await api.get(`/users/${userId}`);
    setUser(response.data);
  }, [userId]); // Recreate only when userId changes
  
  useEffect(() => {
    fetchUser();
  }, [fetchUser]); // Stable reference prevents infinite loops
}

// 3. Callback in performance-critical lists
function UserList({ users }) {
  const handleUserClick = useCallback((userId: number) => {
    navigate(`/users/${userId}`);
  }, [navigate]); // navigate is stable from useNavigate
  
  return (
    <div>
      {users.map(user => (
        <MemoizedUserCard
          key={user.id}
          user={user}
          onClick={() => handleUserClick(user.id)} // Still inline, but handleUserClick is memoized
        />
      ))}
    </div>
  );
}
```

## Performance Optimization Checklist

### 1. **Measure First** ⏱️
Use React DevTools Profiler to identify actual bottlenecks:
```bash
# Enable profiling in development
npm start
# Open React DevTools > Profiler
# Record interaction > Find slow components
```

### 2. **Optimize in Order of Impact** 📊

**High Impact:**
- ✅ Lazy load routes/components (already done)
- ✅ Use React Query for caching (already done)
- ✅ Fix N+1 queries (already done)
- ✅ Code splitting with dynamic imports
- Virtualize long lists (react-window, react-virtual)
- Optimize images (WebP, lazy loading, CDN)

**Medium Impact:**
- Memoize expensive calculations with useMemo
- Memoize components with React.memo (for list items)
- Debounce search/filter inputs
- Use pagination instead of loading all data

**Low Impact (Micro-optimizations):**
- useCallback for every handler
- Inline style objects to CSS classes
- Extracting every inline function

### 3. **When to Use Memoization** 🎯

#### useMemo - Expensive Calculations
```tsx
// ❌ Don't: Simple calculations
const total = items.reduce((sum, item) => sum + item.price, 0);

// ✅ Do: Expensive processing
const processedData = useMemo(() => {
  return hugeDataset
    .filter(complexFilter)
    .map(expensiveTransform)
    .sort(complexSort);
}, [hugeDataset, filterCriteria]);
```

#### React.memo - Prevent Child Re-renders
```tsx
// ✅ Use for list items that re-render frequently
const UserCard = React.memo(({ user, onClick }: UserCardProps) => {
  return (
    <div onClick={onClick}>
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  );
});

// Then useCallback for the onClick handler
function UserList({ users }) {
  const handleClick = useCallback((id) => {
    navigate(`/users/${id}`);
  }, [navigate]);
  
  return users.map(user => (
    <UserCard key={user.id} user={user} onClick={() => handleClick(user.id)} />
  ));
}
```

## Current Codebase Status

### Already Optimized ✅
- Lazy loading for non-critical routes
- React Query caching and background refetching
- Database query optimization (N+1 fixes, specific columns)
- Code splitting (lazy imports)
- Error boundaries to prevent cascade failures

### Potential Optimizations 🔄

**If Performance Issues Arise:**

1. **ManageEvent.tsx** - Large component, could benefit from:
   - Splitting remaining tabs (Details, Guests, Communication)
   - Memoizing tab components with React.memo
   - useCallback for tab switch handlers

2. **EventPage.tsx** - Public page, high traffic:
   - Memoize charity cards
   - Lazy load donation form
   - Image optimization (WebP, lazy loading)

3. **Dashboard.tsx** - Multiple data sources:
   - Already uses React Query caching ✅
   - Could virtualize long event lists if >50 events

4. **List Components**:
   - Guests table: Virtualize if >100 guests
   - Donations list: Virtualize if >100 donations
   - Charities grid: Fine as-is (<50 items typically)

## Recommended Approach

1. **Don't optimize prematurely** - Current performance is good
2. **Monitor in production** - Use analytics to find slow pages
3. **Optimize based on data** - React Profiler + analytics
4. **Start with high-impact wins** - Already done! ✅

## Tools for Performance Monitoring

```bash
# React DevTools Profiler
# Browser DevTools > React > Profiler

# Lighthouse Performance Audit
# Browser DevTools > Lighthouse > Generate report

# Web Vitals
npm install web-vitals
# Track Core Web Vitals: LCP, FID, CLS
```

## Summary

**Current state:** Application is well-optimized with React Query, lazy loading, and database optimizations.

**When to revisit:**
- User reports slow page loads
- Lighthouse score <90
- React Profiler shows components >16ms render time
- Lists exceed 100 items without virtualization

**Most impactful next steps** (only if needed):
1. Virtualize long lists (guests, donations)
2. Optimize images (WebP format, lazy loading)
3. Implement service worker for offline caching
4. Add CDN for static assets
