"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

type Area = "Økonomi" | "Hjem" | "Relation" | "Arbejde" | "Dig";

export type Suggestion = {
  id: string;
  text: string;
  area: Area;
};

type Props = {
  suggestion: Suggestion;
  onSelect: (suggestion: Suggestion) => void;
};

export default function SuggestionCard({ suggestion, onSelect }: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(suggestion)}
      type="button"
      className="w-full rounded-3xl border-[3px] border-black bg-white px-4 py-4 text-left shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-black leading-tight">
            {suggestion.text}
          </div>

          {/* Diskret område (sekundært) */}
          <div className="mt-2 inline-flex rounded-full border-[2px] border-black px-2 py-0.5 text-xs font-bold uppercase tracking-wide opacity-70">
            {suggestion.area}
          </div>
        </div>

        <ChevronRight className="mt-1 h-5 w-5 shrink-0" />
      </div>
    </motion.button>
  );
}