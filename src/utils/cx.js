// Lets us keep the original design's hyphenated class-name strings
// (e.g. "nav-item active") while using scoped CSS Modules per page.
// Usage: cx(styles, 'nav-item', isActive && 'active')
export function cx(styles, ...classNames) {
  return classNames
    .filter(Boolean)
    .flatMap((c) => c.split(' '))
    .map((c) => styles[c] || c)
    .join(' ');
}
