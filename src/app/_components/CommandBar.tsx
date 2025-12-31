"use client";

import * as React from "react";

export function CommandBar({
  onSubmit,
  disabled,
}: {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}) {
  const [text, setText] = React.useState("");

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const t = text.trim();
        if (!t || disabled) return;
        onSubmit(t);
        setText("");
      }}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='Try: "sneak past the guards" | "search the room" | "persuade" | attack | roll 1d20'
        className="h-11 w-full rounded-md border border-foreground/15 bg-background px-3 text-sm outline-none focus:border-foreground/30"
        disabled={disabled}
        aria-label="Command input"
      />
      <button
        type="submit"
        disabled={disabled}
        className="h-11 shrink-0 rounded-md border border-foreground/15 bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50"
      >
        Roll
      </button>
    </form>
  );
}
