import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Brand is locked: app/globals.css must carry exactly the values in docs/brand/tokens.json.
const root = join(__dirname, "..");
const tokens = JSON.parse(readFileSync(join(root, "docs/brand/tokens.json"), "utf8"));
const css = readFileSync(join(root, "app/globals.css"), "utf8");

function block(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `${selector} block`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf("}", start));
}

function cssVar(scope: string, name: string): string | undefined {
  return scope.match(new RegExp(`--x-${name}:\\s*([^;]+);`))?.[1].trim().toLowerCase();
}

describe("brand colour tokens", () => {
  const light = block(":root");
  const prive = block('[data-theme="prive"]');

  for (const t of tokens.color.tokens as { name: string; value: { light: string; dark: string } }[]) {
    it(`${t.name} matches in Ivory & Ink and Privé`, () => {
      expect(cssVar(light, t.name)).toBe(t.value.light.toLowerCase());
      expect(cssVar(prive, t.name)).toBe(t.value.dark.toLowerCase());
    });
  }
});

describe("type, spacing and radius tokens", () => {
  for (const group of tokens.type.groups) {
    for (const s of group.styles) {
      it(`text-${s.name} is ${s.fontSize}/${s.lineHeight}`, () => {
        expect(css).toContain(`--text-${s.name}: ${s.fontSize};`);
        expect(css).toContain(`--text-${s.name}--line-height: ${s.lineHeight};`);
      });
    }
  }
  for (const s of tokens.spacing.tokens) {
    it(`${s.name} is ${s.value}`, () => expect(css).toContain(`--spacing-${s.name}: ${s.value};`));
  }
  for (const r of tokens.radius.tokens) {
    it(`${r.name} is ${r.value}`, () => expect(css).toContain(`--${r.name}: ${r.value};`));
  }
});

describe("no raw colours outside the token file", () => {
  it("components and app code contain no hex colours", async () => {
    const { globSync } = await import("node:fs");
    const files = globSync("{app,components,lib}/**/*.{ts,tsx}", { cwd: root });
    const offenders = files.filter((f) => /#[0-9a-f]{3,8}\b/i.test(readFileSync(join(root, f), "utf8")));
    expect(offenders).toEqual([]);
  });
});
