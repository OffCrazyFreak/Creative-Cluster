export interface ITagSeed {
  slug: string;
  labelEn: string;
  labelHr: string;
  aliasesEn?: readonly string[];
  aliasesHr?: readonly string[];
  parent?: string;
  sourceUri?: string;
}
