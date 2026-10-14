import PageContainer from "@/components/custom/layout/page-container";
import { m } from "@/paraglide/messages";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import MarkdownContent from "./markdown-content";

interface IHelpGuidesProps {
  owner: string;
  admin: string | null;
}

export default function HelpGuides({ owner, admin }: IHelpGuidesProps) {
  if (!admin) {
    return (
      <PageContainer as="article" size="prose">
        <MarkdownContent source={owner} />
      </PageContainer>
    );
  }
  return (
    <PageContainer as="div" size="prose">
      <Tabs defaultValue="owner">
        <TabsList aria-label={m.legal_help_guides_label()}>
          <TabsTrigger value="owner">{m.legal_help_owner_tab()}</TabsTrigger>
          <TabsTrigger value="admin">{m.legal_help_admin_tab()}</TabsTrigger>
        </TabsList>
        <TabsContent value="owner" className="pt-4">
          <MarkdownContent source={owner} />
        </TabsContent>
        <TabsContent value="admin" className="pt-4">
          <MarkdownContent source={admin} />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
