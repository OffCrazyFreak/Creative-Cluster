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
      <article className="mx-auto w-full max-w-3xl p-8">
        <MarkdownContent source={owner} />
      </article>
    );
  }
  return (
    <div className="mx-auto w-full max-w-3xl p-8">
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
    </div>
  );
}
