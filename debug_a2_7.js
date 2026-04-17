// In the current layout.tsx, I replaced the single block of the header profile with a conditional block.
// Let's check `image.png`. It shows the dashboard. But the entire header area at the top seems completely missing on the right side! Wait, on the right side of `image.png` there's NOTHING. No pulse skeleton, nothing.
// Is it possible `image.png` is what it looks like currently because `isLoading` is NEVER becoming false?
// Let's check `apollo-pizzaria/hooks/useUser.ts`.
// If `isLoading` is false but `profile` is missing, it should render 'Usuário' and 'U' and the logout button.
// If `isLoading` is stuck on `true`, it renders the skeleton:
/*
<div className="animate-pulse flex items-center gap-4">
  <div className="flex flex-col items-end mr-2 gap-1">
    <div className="h-4 w-24 bg-gray-200 rounded"></div>
    <div className="h-3 w-16 bg-gray-200 rounded"></div>
  </div>
  <div className="w-10 h-10 rounded-full bg-gray-200"></div>
</div>
*/
// The skeleton background is `bg-gray-200`. Wait! `bg-gray-200` is very light, almost white. The background of the header is `bg-white`. The skeleton might be INVISIBLE? Yes, `bg-gray-200` on `bg-white` is barely visible.
// But the logout button is COMPLETELY absent from the `isLoading` state!
// I forgot to include the logout button inside the skeleton (or render it regardless of loading).
// Wait, in `2026-04-17_10-04.png`, it shows "Francisco", "Dev", "F", and the logout icon.
// Is `2026-04-17_10-04.png` from BEFORE the bug, or AFTER? The issue says: "Após mudanças no Header, dados do usuário e logout sumiram no /admin." So `image.png` (where they are absent) is the broken state.
