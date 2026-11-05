const DIRECTIVE =
  /^\s*(eslint-disable|eslint-enable|@ts-|@vitest-environment|@jsx|prettier-ignore|(c8|v8|istanbul) ignore|#region|#endregion|\/ <reference)/;
const BLOCK_DIRECTIVE = /^\s*(eslint\s+[\w@/-]+\s*:|globals?\s|exported\s)/;
const HISTORY = /\b(used to|previously|originally)\b/i;
const MAX_LINE_LENGTH = 120;

function isDirective(comment) {
  return (
    comment.type === "Shebang" ||
    DIRECTIVE.test(comment.value) ||
    (comment.type === "Block" && BLOCK_DIRECTIVE.test(comment.value))
  );
}

function startsItsLine(comment, lines) {
  const before = lines[comment.loc.start.line - 1];
  return before.slice(0, comment.loc.start.column).trim() === "";
}

function continuesLineComment(previous, comment, lines) {
  return (
    previous.type === "Line" &&
    comment.type === "Line" &&
    comment.loc.start.line === previous.loc.end.line + 1 &&
    comment.loc.start.column === previous.loc.start.column &&
    startsItsLine(previous, lines) &&
    startsItsLine(comment, lines)
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
      tooLong: `Keep a comment line to ${MAX_LINE_LENGTH} characters: one short why, or delete it.`,
      history:
        "Keep history out of comments; it belongs in the commit message. Reword if the phrase only sounds like history.",
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
            (previous &&
              continuesLineComment(previous, comment, context.sourceCode.lines))
          ) {
            context.report({ loc: comment.loc, messageId: "multiLine" });
          }
          if (comment.loc.end.column > MAX_LINE_LENGTH) {
            context.report({ loc: comment.loc, messageId: "tooLong" });
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
