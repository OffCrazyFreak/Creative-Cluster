import PageContainer from "./page-container";

interface IPagePlaceholderProps {
  title: string;
}

// Temporary stand-in so the route map and typed links exist before each feature lands.
export default function PagePlaceholder({ title }: IPagePlaceholderProps) {
  return (
    <PageContainer size="prose">
      <h1 className="text-2xl font-semibold">{title}</h1>
    </PageContainer>
  );
}
