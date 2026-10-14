import { useEffect, useState } from "react";

import { loadStrengthChecker } from "./password-strength-loader";

// Advisory only: the score never blocks a save, and stays null until the lists have loaded.
export function usePasswordStrength(password: string) {
  const [requested, setRequested] = useState(false);
  const [result, setResult] = useState<{ password: string; score: number }>();

  useEffect(() => {
    if (!requested || password === "") return;
    let stale = false;
    // Wait for a pause in typing: each check walks the full dictionaries.
    const timer = setTimeout(() => {
      void loadStrengthChecker()
        .then((checker) => checker.checkAsync(password.slice(0, 128)))
        .then((checked) => {
          if (!stale) setResult({ password, score: checked.score });
        })
        .catch(() => {
          // The bar is advisory; without it the form still works.
        });
    }, 200);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [requested, password]);

  const score = result?.password === password ? result.score : null;
  return { score, load: () => setRequested(true) };
}
