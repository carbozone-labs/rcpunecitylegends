import { readFile } from "node:fs/promises";
import ts from "typescript";

// Tiny TypeScript ESM loader used only by the repository's content audit.
// The audited data modules contain type-only imports and have no runtime alias dependencies.
export async function load(url, context, nextLoad) {
  if (url.endsWith(".ts")) {
    const source = await readFile(new URL(url), "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, verbatimModuleSyntax: false },
      fileName: new URL(url).pathname,
    });
    return { format: "module", source: output.outputText, shortCircuit: true };
  }
  return nextLoad(url, context);
}
