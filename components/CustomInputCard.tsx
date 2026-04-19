"use client";

import { PencilLine } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export default function CustomInputCard({
  value,
  onChange,
  onSubmit,
}: Props) {
  const canSubmit = value.trim().length > 0;

  return (
    <div className="rounded-3xl border-[3px] border-black bg-white p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
      <label className="mb-2 flex items-center gap-2 text-sm font-bold opacity-80">
        <PencilLine className="h-4 w-4" />
        Skriv selv
      </label>

      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSubmit) onSubmit();
          }}
          placeholder="Skriv selv..."
          className="w-full rounded-2xl border-[3px] border-black px-4 py-3 text-base font-semibold outline-none"
        />

        <button
          type="button"
          disabled={!canSubmit}
          onClick={onSubmit}
          className="rounded-2xl border-[3px] border-black px-4 py-3 font-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          Vælg
        </button>
      </div>
    </div>
  );
}