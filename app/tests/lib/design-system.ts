import { readFileSync } from "fs";
import { resolve } from "path";
// We use a dynamic import or require because the linter is a CJS/ESM hybrid usually
// For this getting started, we'll parse the YAML frontmatter directly if the linter 
// is strictly for linting, but since we want the structured object:
import { lint } from "@google/design.md/linter";

/**
 * Reads DESIGN.md and returns the structured DesignSystem object.
 * Throws if the design doesn't meet the specification.
 */
export function getDesignSystem() {
  const designPath = resolve(process.cwd(), "DESIGN.md");
  const markdown = readFileSync(designPath, "utf-8");
  
  const report = lint(markdown);
  
  if (report.summary.errors > 0) {
    console.error("❌ DESIGN.md has linting errors:", report.findings);
    throw new Error("DESIGN.md linting failed. Fix design errors before running tests.");
  }
  
  return report.designSystem;
}
