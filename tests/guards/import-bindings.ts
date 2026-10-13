import ts from "typescript";

export const GUARDS = ["publicGuard", "memberGuard", "adminGuard"];

const START_MODULE = "@tanstack/react-start";
const GUARDS_MODULE = "@/server/guards";

export interface IBindings {
  serverFnNames: Set<string>;
  startNamespaces: Set<string>;
  guardNames: Set<string>;
}

// Resolves local names so an aliased createServerFn or a locally declared fake guard is still caught.
export function importBindings(sourceFile: ts.SourceFile): IBindings {
  const bindings: IBindings = {
    serverFnNames: new Set(),
    startNamespaces: new Set(),
    guardNames: new Set(),
  };

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const from = (statement.moduleSpecifier as ts.StringLiteral).text;
    const named = statement.importClause?.namedBindings;
    if (!named) continue;

    if (ts.isNamespaceImport(named) && from === START_MODULE) {
      bindings.startNamespaces.add(named.name.text);
      continue;
    }
    if (!ts.isNamedImports(named)) continue;
    for (const element of named.elements) {
      const imported = (element.propertyName ?? element.name).text;
      if (from === START_MODULE && imported === "createServerFn") {
        bindings.serverFnNames.add(element.name.text);
      }
      if (from === GUARDS_MODULE && GUARDS.includes(imported)) {
        bindings.guardNames.add(element.name.text);
      }
    }
  }
  return bindings;
}
