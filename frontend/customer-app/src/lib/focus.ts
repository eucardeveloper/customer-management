type Blurable = { blur?: () => void };
type FocusHolder = { activeElement: Element | Blurable | null };

// A modal drawer marks the page behind it aria-hidden. If a button there still holds focus,
// the browser warns about it, so the focused element is blurred before the drawer opens.
export function blurActiveElement(doc: FocusHolder | undefined = typeof document === 'undefined' ? undefined : document): void {
  (doc?.activeElement as Blurable | null | undefined)?.blur?.();
}
