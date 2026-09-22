import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";

const clientRoot = process.cwd();
const librariesDirectory = resolve(clientRoot, "public", "libraries");
const packageJson = JSON.parse(
  readFileSync(join(clientRoot, "package.json"), "utf8"),
);
const echartsAsset = join(librariesDirectory, "echarts@6.1.0.js");
const echartsGlAsset = join(librariesDirectory, "echarts-gl@2.1.0.js");
const legacyEchartsAsset = join(librariesDirectory, "echarts@5.4.3.js");
const legacyEchartsGlAsset = join(librariesDirectory, "echarts-gl@2.0.9.js");

describe("ChartWidget runtime assets", () => {
  it("pins and ships the ECharts 6 runtime with ECharts GL", () => {
    expect(packageJson.dependencies.echarts).toBe("6.1.0");
    expect(packageJson.dependencies["echarts-gl"]).toBe("2.1.0");
    expect(existsSync(echartsAsset)).toBe(true);
    expect(existsSync(echartsGlAsset)).toBe(true);
    expect(readFileSync(echartsAsset, "utf8")).toContain('t.version="6.1.0"');
    expect(existsSync(legacyEchartsAsset)).toBe(false);
    expect(existsSync(legacyEchartsGlAsset)).toBe(false);
  });
});
