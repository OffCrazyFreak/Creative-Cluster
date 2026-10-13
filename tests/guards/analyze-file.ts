import ts from "typescript";

import { importBindings } from "./import-bindings";
import {
  checkServerFn,
  isCreateServerFn,
  type IViolation,
} from "./server-fn-rules";

// A route with a `server: { handlers }` block is a raw HTTP endpoint with no guard.
function isServerRouteBlock(node: ts.Node): boolean {
  return (
    ts.isPropertyAssignment(node) &&
    ts.isIdentifier(node.name) &&
    node.name.text === "server" &&
    ts.isObjectLiteralExpression(node.initializer) &&
    node.initializer.properties.some(
      (property) =>
        property.name !== undefined &&
        ts.isIdentifier(property.name) &&
        property.name.text === "handlers",
    )
  );
}

export function analyzeFile(
  file: string,
  source: string,
  allowedServerRoutes: readonly string[],
): IViolation[] {
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const violations: IViolation[] = [];
  const bindings = importBindings(sourceFile);

  function lineOf(node: ts.Node) {
    return sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
  }

  function visit(node: ts.Node) {
    if (isCreateServerFn(node, bindings)) {
      for (const rule of checkServerFn(node, file, bindings)) {
        violations.push({ file, line: lineOf(node), rule });
      }
    }
    if (
      isServerRouteBlock(node) &&
      !allowedServerRoutes.some((route) =>
        file.replaceAll("\\", "/").endsWith(route),
      )
    ) {
      violations.push({
        file,
        line: lineOf(node),
        rule: "server route not in the allowlist",
      });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}
