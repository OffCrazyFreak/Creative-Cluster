export interface IRichTextMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface IRichTextNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: IRichTextNode[];
  marks?: IRichTextMark[];
  text?: string;
}

// ProseMirror JSON as Tiptap stores it; validated against the editor schema on save.
export interface RichTextDoc extends IRichTextNode {
  type: "doc";
}

// parseRichText only lets scalar attributes through, so the stored RichTextDoc is safe to narrow to this for server functions.
export interface IJsonRichTextNode {
  type: string;
  attrs?: Record<string, string | number | boolean | null>;
  content?: IJsonRichTextNode[];
  marks?: {
    type: string;
    attrs?: Record<string, string | number | boolean | null>;
  }[];
  text?: string;
}

export interface JsonRichTextDoc extends IJsonRichTextNode {
  type: "doc";
}

// TanStack Form's key walker overflows on the recursive RichTextDoc type; the server still validates with richTextInput.
export interface IFormRichText {
  type: "doc";
  content?: readonly unknown[];
}
