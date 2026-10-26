import { it, expect } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import { createSvg, DrawOptions } from "..";
import * as grids from "@snk/types/__fixtures__/grid";
import { snake3 as snake } from "@snk/types/__fixtures__/snake";
import { getBestRoute } from "@snk/solver/getBestRoute";

const drawOptions: DrawOptions = {
  sizeDotBorderRadius: 2,
  sizeCell: 16,
  sizeDot: 12,
  colorDotBorder: "#1b1f230a",
  colorDots: { 1: "#9be9a8", 2: "#40c463", 3: "#30a14e", 4: "#216e39" },
  colorEmpty: "#ebedf0",
  colorSnake: "purple",
  dark: {
    colorEmpty: "#161b22",
    colorDots: { 1: "#01311f", 2: "#034525", 3: "#0f6d31", 4: "#00c647" },
  },
};

const animationOptions = { stepDurationMs: 100 };

const dir = path.resolve(__dirname, "__snapshots__");

try {
  fs.mkdirSync(dir);
} catch (err) {}

for (const [key, grid] of Object.entries(grids))
  it(`should generate ${key} svg`, async () => {
    const chain = [snake, ...getBestRoute(grid, snake)!];

    const svg = await createSvg(
      grid,
      null,
      chain,
      drawOptions,
      animationOptions,
    );

    expect(svg).toBeDefined();

    fs.writeFileSync(path.resolve(dir, key + ".svg"), svg);
  });

it("should add tail segments when snakeLength exceeds the base length (3 in this fixture)", () => {
  const grid = Object.values(grids)[0];
  const chain = [snake, ...getBestRoute(grid, snake)!];
  const count = (o: DrawOptions) =>
    createSvg(grid, null, chain, o, animationOptions).match(/class="s s\d+"/g)!
      .length;

  expect(count(drawOptions)).toBe(3);
  expect(count({ ...drawOptions, snakeLength: 12 })).toBe(12);
  expect(count({ ...drawOptions, snakeLength: 2 })).toBe(3);
});
