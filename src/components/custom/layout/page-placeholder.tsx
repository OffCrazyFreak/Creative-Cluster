interface IPagePlaceholderProps {
  title: string;
}

// Temporary stand-in so the route map and typed links exist before each feature lands.
export default function PagePlaceholder({ title }: IPagePlaceholderProps) {
  return (
    <section className="mx-auto w-full max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">{title}</h1>
    </section>
  );
}
