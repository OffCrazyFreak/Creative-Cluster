import type { IDigestItem } from "../email-types";

interface IDigestListProps {
  items: IDigestItem[];
}

// Names and short details only: no applicant or reporter personal data goes into a batch mail.
export default function DigestList({ items }: IDigestListProps) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={`${item.name}-${index}`}>
          {item.name} ({item.detail})
        </li>
      ))}
    </ul>
  );
}
