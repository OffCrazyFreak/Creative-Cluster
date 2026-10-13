import { useEffect, useState } from "react";

import { loadStrengthChecker } from "./password-strength-loader";

// Advisory only: the score never blocks a save, and stays null until the lists have loaded.
export function usePasswordStrength(password: string) {
  const [requested, setRequested] = useState(false);
  const [result, setResult] = useState<{ password: string; score: number }>();

  useEffect(() => {
    if (!requested || password === "") return;
    let stale = false;
    void loadStrengthChecker()
      .then((checker) => checker.checkAsync(password.slice(0, 128)))
      .then((checked) => {
        if (!stale) setResult({ password, score: checked.score });
      });
    return () => {
      stale = true;
    };
  }, [requested, password]);

  const score = result?.password === password ? result.score : null;
  return { score, load: () => setRequested(true) };
}
