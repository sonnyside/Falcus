"use client";

import { useState } from "react";
import { suggestions } from "../lib/suggestions";
import SuggestionCard from "../components/SuggestionCard";

export default function Page() {
  const [selected, setSelected] = useState<string | null>(null);

  if (selected) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Klar?</h2>
        <p>{selected}</p>
        <button onClick={() => alert("Done!")}>Start</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Hvad er det mindste du kan gøre lige nu?</h2>

      {suggestions.map((s, i) => (
        <SuggestionCard
          key={i}
          text={s.text}
          area={s.area}
          onClick={() => setSelected(s.text)}
        />
      ))}
    </div>
  );
}