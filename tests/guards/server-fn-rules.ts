import ts from "typescript";

import type { IBindings } from "./import-bindings";

export interface IViolation {
  file: string;
  line: number;
  rule: string;
}

export function isCreateServerFn(
  node: ts.Node,
  bindings: IBindings,
): node is ts.CallExpression {
  if (!ts.isCallExpression(node)) return false;
  const callee = node.expression;
  if (ts.isIdentifier(callee)) return bindings.serverFnNames.has(callee.text);
  return (
    ts.isPropertyAccessExpression(callee) &&
    ts.isIdentifier(callee.expression) &&
    bindings.startNamespaces.has(callee.expression.text) &&
    callee.name.text === "createServerFn"
  );
}

// Collects the builder chain createServerFn(...).a(...).b(...) as [{ name, args }].
function chainOf(call: ts.CallExpression) {
  const steps: { name: string; args: ts.NodeArray<ts.Expression> }[] = [];
  let node: ts.Node = call;
  while (
    ts.isPropertyAccessExpression(node.parent) &&
    ts.isCallExpression(node.parent.parent)
  ) {
    steps.push({
      name: node.parent.name.text,
      args: node.parent.parent.arguments,
    });
    node = node.parent.parent;
  }
  return steps;
}

function isGuard(
  node: ts.Expression | undefined,
  bindings: IBindings,
): boolean {
  return (
    node !== undefined &&
    ts.isIdentifier(node) &&
    bindings.guardNames.has(node.text)
  );
}

function guardProblem(
  steps: ReturnType<typeof chainOf>,
  bindings: IBindings,
): string | null {
  const first = steps[0];
  const list = first?.name === "middleware" ? first.args[0] : undefined;
  if (
    !list ||
    !ts.isArrayLiteralExpression(list) ||
    !isGuard(list.elements[0], bindings)
  ) {
    return "first call must be .middleware([<guard>, ...])";
  }
  const guards = list.elements.filter((element) => isGuard(element, bindings));
  return guards.length === 1 ? null : "exactly one guard per server function";
}

export function checkServerFn(
  call: ts.CallExpression,
  file: string,
  bindings: IBindings,
): string[] {
  const problems: string[] = [];
  if (!file.endsWith(".functions.ts"))
    problems.push("outside a *.functions.ts file");

  const steps = chainOf(call);
  const guard = guardProblem(steps, bindings);
  if (guard) problems.push(guard);

  const names = steps.map((step) => step.name);
  const validator = names.indexOf("inputValidator");
  const handler = names.indexOf("handler");
  if (validator === -1 || (handler !== -1 && validator > handler)) {
    problems.push("missing .inputValidator(...) before .handler(...)");
  }
  return problems;
}
