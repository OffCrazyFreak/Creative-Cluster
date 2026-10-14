interface IContactHoneypotProps {
  value: string;
  onChange: (value: string) => void;
}

// Hidden from people and screen readers; bots that fill every input give themselves away.
export default function ContactHoneypot({
  value,
  onChange,
}: IContactHoneypotProps) {
  return (
    <div aria-hidden="true" className="sr-only">
      <input
        name="fax"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
