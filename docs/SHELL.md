# AppShell

The production port of the design-reference admin chrome. One shell exists:
`src/ui/shell`. Modules render inside its content slot and never build their
own rail, top bar, palette, or toasts.

## What the shell owns

Rail (244px, collapsed 76px, mobile drawer 252px under 900px with scrim),
grouped navigation with active states, command bar (palette trigger,
messages/notifications panels, account menu), ⌘K command palette, ⌘/
shortcuts sheet, G-then-letter jumps, theme switching (light/system/dark),
the toast, and the content card. Modules own everything inside the card.

## Navigation

Generated, never written: `project config → module registry →
getEnabledNavigation() → Sidebar`. The registry's `navigation.icon` is a
plain string key mapped to reference SVG paths in `src/ui/shell/icons.tsx` —
no React in `core/`. Groups render only when they contain enabled items.
Active state derives from the route (`isNavActive` in `helpers.ts`), not
from any selected-screen state. The palette's "Go to" group and the G-jump
map are built from the same enabled items.

## Toasts

```ts
import { useToast } from "@/ui/shell/toast-provider"
const { say } = useToast()
say("Approved")
```

Shell renders it (inverted pill, bottom-right, 2600ms). Never build a
module-specific toast system.

## Overlays

Shell-owned only: palette, shortcuts sheet, messages/notifications panels,
account menu, mobile drawer + scrim. All close on Escape. Module record
drawers and dialogs come later as `src/ui` primitives, not here.

## Keyboard

Owned by the shell (`app-shell-client.tsx`): ⌘/Ctrl K palette, ⌘/ shortcuts,
⌘B collapse, Escape close-anything, `?` shortcuts, G-then-letter jumps to
enabled destinations. Suppressed while an input/textarea/select/
contenteditable has focus, except Escape. Module action shortcuts (J/K,
A/R/S…) belong inside their modules when those port.

## Responsive

Shell breakpoint is the reference's: window < 900px switches to the mobile
bar + drawer. Module-level breakpoints (measured against the panel, not the
window) come with each module's port.

## Theme

`data-theme` on `<html>` (explicit) or system preference; choice persists to
localStorage and replays pre-paint via an inline script in the root layout.
Every shell color is a Task 003 token — no brand literals.
