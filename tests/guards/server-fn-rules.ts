import ts from "typescript";

export const GUARDS = ["publicGuard", "memberGuard", "adminGuard"];

export interface IViolation {
  file: string;
  line: number;
  rule: string;
}

function guardName(node: ts.Expression | undefined): string | null {
  if (!node) return null;
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
    return node.expression.text;
  }
  return null;
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

export function checkServerFn(call: ts.CallExpression, file: string): string[] {
  const problems: string[] = [];
  if (!file.endsWith(".functions.ts"))
    problems.push("outside a *.functions.ts file");

  const steps = chainOf(call);
  const first = steps[0];
  const middleware = first?.name === "middleware" ? first.args[0] : undefined;
  const firstGuard =
    middleware && ts.isArrayLiteralExpression(middleware)
      ? guardName(middleware.elements[0])
      : null;
  if (!firstGuard || !GUARDS.includes(firstGuard)) {
    problems.push("first call must be .middleware([<guard>, ...])");
  }

  const names = steps.map((step) => step.name);
  const validator = names.indexOf("inputValidator");
  const handler = names.indexOf("handler");
  if (validator === -1 || (handler !== -1 && validator > handler)) {
    problems.push("missing .inputValidator(...) before .handler(...)");
  }
  return problems;
}
