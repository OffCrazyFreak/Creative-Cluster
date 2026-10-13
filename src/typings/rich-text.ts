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
