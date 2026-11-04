const DIRECTIVE =
  /^\s*(eslint|@ts-|@type-check|@vitest-environment|@jsx|global\b|globals\b|exported\b|prettier-ignore|istanbul|c8\b|v8 ignore|#region|#endregion)/;
const HISTORY = /\b(used to|previously|originally)\b/i;

function isDirective(comment) {
  return comment.type === "Shebang" || DIRECTIVE.test(comment.value);
}

function continuesLineComment(previous, comment) {
  return (
    previous.type === "Line" &&
    comment.type === "Line" &&
    comment.loc.start.line === previous.loc.end.line + 1 &&
    comment.loc.start.column === previous.loc.start.column
  );
}

/** @type {import("eslint").Rule.RuleModule} */
export default {
  meta: {
    type: "suggestion",
    schema: [],
    messages: {
      multiLine:
        "Keep a comment to one line: the why the code cannot show. Rename or restructure instead of explaining.",
      history:
        "Keep history out of comments; it belongs in the commit message.",
    },
  },
  create(context) {
    return {
      Program() {
        let previous = null;
        for (const comment of context.sourceCode.getAllComments()) {
          if (isDirective(comment)) {
            previous = null;
            continue;
          }
          if (
            comment.loc.start.line !== comment.loc.end.line ||
            (previous && continuesLineComment(previous, comment))
          ) {
            context.report({ loc: comment.loc, messageId: "multiLine" });
          }
          if (HISTORY.test(comment.value)) {
            context.report({ loc: comment.loc, messageId: "history" });
          }
          previous = comment;
        }
      },
    };
  },
};
