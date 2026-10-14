import { useState } from "react";

import ProposeFormBody from "./propose-form-body";

interface IProposeFormProps {
  entries: { id: string; name: string }[];
}

// Remounting after a send clears the form and the partner search text together.
export default function ProposeForm({ entries }: IProposeFormProps) {
  const [round, setRound] = useState(0);
  return (
    <ProposeFormBody
      key={round}
      entries={entries}
      onSent={() => setRound((value) => value + 1)}
    />
  );
}
