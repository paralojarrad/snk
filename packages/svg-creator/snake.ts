import { getSnakeLength, snakeToCells } from "@snk/types/snake";
import type { Snake } from "@snk/types/snake";
import type { Point } from "@snk/types/point";
import { h } from "./xml-utils";
import { createAnimation } from "./css-utils";

export type Options = {
  colorSnake: string;
  sizeCell: number;
  sizeDot: number;
  /** total snake length once every cell is eaten; the tail grows towards it. unset or <= the base length keeps the snake fixed */
  snakeLength?: number;
};

const lerp = (k: number, a: number, b: number) => (1 - k) * a + k * b;

type Frame = Point & { visible: boolean };

/**
 * length of the snake at each step: grows evenly with the number of cells eaten, then retracts on the way back to the starting pose
 */
const getLengths = (
  n: number,
  baseN: number,
  maxN: number,
  eaten: number[],
) => {
  const total = eaten.length;
  const lastEaten = total ? Math.max(...eaten) : -1;
  const sorted = [...eaten].sort((a, b) => a - b);

  let k = 0;
  return Array.from({ length: n }, (_, f) => {
    while (k < total && sorted[k] <= f) k++;
    const grown = baseN + Math.floor(((maxN - baseN) * k) / Math.max(total, 1));
    return f <= lastEaten ? grown : Math.max(baseN, grown - (f - lastEaten));
  });
};

export const createSnake = (
  chain: Snake[],
  { sizeCell, sizeDot, snakeLength }: Options,
  duration: number,
  eatenSteps: number[] = [],
) => {
  const baseN = chain[0] ? getSnakeLength(chain[0]) : 0;
  const snakeN = Math.max(baseN, Math.floor(snakeLength ?? 0));

  const chainCells = chain.map(snakeToCells);
  const lengths = getLengths(chain.length, baseN, snakeN, eatenSteps);

  // a segment sits where the head was i steps ago, before the first step it follows the starting pose
  const snakeParts: Frame[][] = Array.from({ length: snakeN }, (_, i) =>
    chain.map((_, f) => {
      const c =
        i < baseN
          ? chainCells[f][i]
          : f - i >= 0
            ? chainCells[f - i][0]
            : chainCells[0][Math.min(i - f, baseN - 1)];
      return { x: c.x, y: c.y, visible: i < baseN || lengths[f] > i };
    }),
  );

  const svgElements = snakeParts.map((_, i, { length }) => {
    // compute snake part size
    const dMin = sizeDot * 0.8;
    const dMax = sizeCell * 0.9;
    const iMax = Math.min(4, length);
    const u = (1 - Math.min(i, iMax) / iMax) ** 2;
    const s = lerp(u, dMin, dMax);

    const m = (sizeCell - s) / 2;

    const r = Math.min(4.5, (4 * s) / sizeDot);

    return h("rect", {
      class: `s s${i}`,
      x: m.toFixed(1),
      y: m.toFixed(1),
      width: s.toFixed(1),
      height: s.toFixed(1),
      rx: r.toFixed(1),
      ry: r.toFixed(1),
    });
  });

  const transform = ({ x, y, visible }: Frame, grows: boolean) =>
    `transform:translate(${x * sizeCell}px,${y * sizeCell}px)` +
    (grows ? `;opacity:${visible ? 1 : 0}` : "");

  const styles = [
    `.s{ 
      shape-rendering: geometricPrecision;
      fill: var(--cs);
      animation: none linear ${duration}ms infinite
    }`,

    ...snakeParts.map((positions, i) => {
      const id = `s${i}`;
      const animationName = id;

      const grows = i >= baseN;
      const keyframes = removeInterpolatedPositions(
        positions.map((tr, i, { length }) => ({ ...tr, t: i / length })),
      ).map(({ t, ...p }) => ({ t, style: transform(p, grows) }));

      return [
        createAnimation(animationName, keyframes),

        `.s.${id}{
          ${transform(positions[0], grows)};
          animation-name: ${animationName}
        }`,
      ];
    }),
  ].flat();

  return { svgElements, styles };
};

const removeInterpolatedPositions = <T extends Frame>(arr: T[]) =>
  arr.filter((u, i, arr) => {
    if (i - 1 < 0 || i + 1 >= arr.length) return true;

    const a = arr[i - 1];
    const b = arr[i + 1];

    const ex = (a.x + b.x) / 2;
    const ey = (a.y + b.y) / 2;

    // return true;
    return !(
      Math.abs(ex - u.x) < 0.01 &&
      Math.abs(ey - u.y) < 0.01 &&
      a.visible === u.visible &&
      b.visible === u.visible
    );
  });
