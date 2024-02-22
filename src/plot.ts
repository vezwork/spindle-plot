import { Data, Datum, compareData } from "./script.js";
import {
  Vec2,
  add,
  distance,
  mul,
  normalVec2FromAngle,
  setLength,
  sub,
} from "./vec2.js";
import { WatchableValue } from "./watchable.js";

const svgEl = document.getElementById("chart-svg") as unknown as SVGElement;

// svg coordinates of the chart
const chartSvgBounds = {
  top: 30,
  left: 30,
  bottom: 280,
  right: 280,
};
// ranges of value of data to plot in the chart
const chartDataBounds = {
  xAxisMin: 0,
  xAxisMax: 9,
  xAxisDiscete: true,
  yAxisMin: 0,
  yAxisMax: 150,
  yAxisDiscrete: false,
};

const points = new Set<SVGCircleElement>();
const dataFromPoint = new Map();

const rect = makeRectSvgEl(svgEl);
rect.setAttribute("x", String(-10));
rect.setAttribute("y", String(chartSvgBounds.top));
rect.setAttribute("width", String(0));
rect.setAttribute("height", String(chartSvgBounds.bottom - chartSvgBounds.top));
rect.setAttribute("fill", "rgba(0,0,0,0.1)");

/**
 *
 * @param dataPoint When this value changes, it is re-plotted in the plot
 * @param color color of the point
 */
export function addPlotPoint(
  dataPoint: WatchableValue<Datum>,
  color: string = "black"
) {
  const circleEl = makeCircleSvgEl(svgEl) as SVGCircleElement;

  points.add(circleEl);
  dataFromPoint.set(circleEl, dataPoint);
  let data = svgPointFromDatumPoint(dataPoint.getValue().value);

  circleEl.setAttribute("cx", String(data[0]));
  circleEl.setAttribute("cy", String(data[1]));

  const sync = ({ value, highlighted }) => {
    data = svgPointFromDatumPoint(value);

    circleEl.setAttribute(
      "style",
      `fill: ${color}; stroke: black; r: ${highlighted ? 7 : 5}`
    );
  };

  dataPoint.onChange(sync);
  sync(dataPoint.getValue());
}

// TODO: batch this for perf
// TODO: find a stable algorithm for this
// - e.g. https://www.d3indepth.com/force-layout/
// - e.g. https://users.monash.edu/~tdwyer/Dwyer2009FastConstraints.pdf
// TODO: once points stabilize, stop animating them, reactivate their animations when they are interacted with
function draw() {
  requestAnimationFrame(draw);

  const forces = new Map<SVGCircleElement, Vec2>();

  for (const circleEl of points) {
    const x = Number(circleEl.getAttribute("cx"));
    const y = Number(circleEl.getAttribute("cy"));

    const dataPoint = dataFromPoint.get(circleEl);
    const data = svgPointFromDatumPoint((dataPoint as any).getValue().value);

    let force = [(data[0] - x) / 5, (data[1] - y) / 5] as Vec2; // initialize force towards actual data position

    for (const point of points) {
      if (point === circleEl) continue;
      const pv = [
        Number(point.getAttribute("cx")),
        Number(point.getAttribute("cy")),
      ] as Vec2;
      const dist = distance([x, y], pv);

      if (dist < 1) {
        const offset = [Math.random(), Math.random()] as Vec2;
        force = add(offset, force);
      } else if (dist < 20) {
        const offset = setLength((20 - dist) / 10, sub([x, y], pv));
        force = add(offset, force);
      }
    }
    forces.set(circleEl, force);
  }

  for (const [circleEl, force] of forces) {
    const x = Number(circleEl.getAttribute("cx"));
    const y = Number(circleEl.getAttribute("cy"));
    circleEl.setAttribute("cx", String(x + force[0]));
    circleEl.setAttribute("cy", String(y + force[1]));
  }
}
draw();

/*****************
 * Input handling
 ***************/

const DATUM_HOVER_RADIUS = 10;

let grabbing: null | WatchableValue<Datum> = null;
const MOUSE_EVENT_LEFT_BUTTON = 1;
let mouse = [0, 0] as [number, number];

let isLeftSelectBarGrabbing = false;
let isRightSelectBarGrabbing = false;

svgEl.addEventListener("mousedown", (e) => {
  // if mouse is close to point, grab it
  if (e.buttons === MOUSE_EVENT_LEFT_BUTTON) {
    const dataCloseToMouse = dataCloseToPoint(compareData, mouse);
    // TODO: add functionality to click through to select points behind the 0th point
    if (dataCloseToMouse[0]) {
      grabbing = dataCloseToMouse[0];
      e.preventDefault();
    } else {
      const m = datumPointFromSvgPoint(mouse);
      const mm = svgPointFromDatumPoint([Math.round(m[0]), m[1]]);
      // if mouse close to select bar then grab it
      const leftSelectData = datumPointFromSvgPoint([
        Number(rect.getAttribute("x")),
        0,
      ]);
      const rightSelectData = datumPointFromSvgPoint([
        Number(rect.getAttribute("x")) + Number(rect.getAttribute("width")),
        0,
      ]);
      isLeftSelectBarGrabbing = Math.round(m[0]) === leftSelectData[0];
      isRightSelectBarGrabbing = Math.round(m[0]) === rightSelectData[0];
      console.log(isLeftSelectBarGrabbing, isRightSelectBarGrabbing);
      if (!isLeftSelectBarGrabbing && !isRightSelectBarGrabbing) {
        // else define selection
        rect.setAttribute("x", String(mm[0]));
        rect.setAttribute("width", String(0));
      }

      e.preventDefault();
    }
  }
});

svgEl.addEventListener("mouseup", (e) => {
  grabbing = null;
});
svgEl.addEventListener("mousemove", (e) => {
  mouse = [e.offsetX, e.offsetY];

  if (!grabbing) {
    const m = datumPointFromSvgPoint(mouse);
    const mm = svgPointFromDatumPoint([Math.round(m[0]), m[1]]);

    // if grabbing select bar then move it and re-group points
    if (isLeftSelectBarGrabbing) {
      // TODO
    } else if (isRightSelectBarGrabbing) {
      if (e.buttons === MOUSE_EVENT_LEFT_BUTTON) {
        const [MAX] = datumPointFromSvgPoint([
          Number(rect.getAttribute("x")) + Number(rect.getAttribute("width")),
          0,
        ]);
        const [MIN] = datumPointFromSvgPoint([
          Number(rect.getAttribute("x")),
          0,
        ]);

        if (m[0] - MIN < 1) return; // don't let selection get to zero width

        rect.setAttribute(
          "width",
          String(mm[0] - Number(rect.getAttribute("x")))
        );

        const NEWMIN = MIN;
        const [NEWMAX] = datumPointFromSvgPoint([
          Number(rect.getAttribute("x")) + Number(rect.getAttribute("width")),
          0,
        ]);

        [...points]
          .map((p) => dataFromPoint.get(p))
          .forEach((d) => {
            const v = d.getValue().value;
            const y = v[1];
            const NEWWIDTH = NEWMAX - NEWMIN;
            const OLDWIDTH = MAX - MIN;
            if (v[0] >= MIN && v[0] <= MAX) {
              const x =
                Math.floor((v[0] - MIN) * (NEWWIDTH / OLDWIDTH)) + NEWMIN;
              d.setValue({
                value: [x, y],
                highlighted: v.highlighted,
              });
            }
          });
      }
    }
    // else move width of selection being defined
    else {
      if (e.buttons === MOUSE_EVENT_LEFT_BUTTON)
        rect.setAttribute(
          "width",
          String(mm[0] - Number(rect.getAttribute("x")))
        );
    }
  }

  // highlight/unhighlight points if they are close/far from mouse respectively
  const dataCloseToMouse = dataCloseToPoint(compareData, mouse);
  for (const datum of dataCloseToMouse) {
    datum.setValue({
      value: datum.getValue().value,
      highlighted: true,
    });
  }
  const dataNotCloseToMouse = dataNotCloseToPoint(compareData, mouse);
  for (const datum of dataNotCloseToMouse) {
    if (datum.getValue().highlighted && datum !== grabbing) {
      datum.setValue({
        value: datum.getValue().value,
        highlighted: false,
      });
    }
  }

  // set mouse cursor
  if (grabbing) {
    svgEl.setAttribute("style", "cursor: grabbing");
  } else {
    if (dataCloseToMouse.length > 0)
      svgEl.setAttribute("style", "cursor: pointer");
    else svgEl.setAttribute("style", "cursor: default");
  }

  // move grabbed point to mouse
  if (grabbing) {
    const convertedValue = datumPointFromSvgPoint(mouse);
    grabbing.setValue({
      value: [Math.round(convertedValue[0]), convertedValue[1]], // round x value because it is discrete
      highlighted: true,
    });
    e.preventDefault();
  }
});

/**
 * Note: This function iterates over all points so has an `O(|data|)` runtime.
 *   It can be sped up using a spatial data structure, such as a quad-tree.
 *
 * @returns true iff there is at least one close datum
 */
function dataCloseToPoint(
  allData: Data[],
  point: [number, number]
): WatchableValue<Datum>[] {
  return [...points]
    .map((p) => ({
      p,
      v: [
        Number((p as any).getAttribute("cx")),
        Number((p as any).getAttribute("cy")),
      ] as [number, number],
    }))
    .filter(({ p, v }) => distance(point, v) < DATUM_HOVER_RADIUS)
    .map(({ p, v }) => dataFromPoint.get(p));
}
function dataNotCloseToPoint(
  allData: Data[],
  point: [number, number]
): WatchableValue<Datum>[] {
  return [...points]
    .map((p) => ({
      p,
      v: [
        Number((p as any).getAttribute("cx")),
        Number((p as any).getAttribute("cy")),
      ] as [number, number],
    }))
    .filter(({ p, v }) => distance(point, v) >= DATUM_HOVER_RADIUS)
    .map(({ p, v }) => dataFromPoint.get(p));
}

/*****************
 * Drawing x and y axis
 ***************/

const yAxisLineEl = makeLineSvgEl(svgEl);
yAxisLineEl.setAttribute("x1", String(chartSvgBounds.left));
yAxisLineEl.setAttribute("y1", String(chartSvgBounds.top));
yAxisLineEl.setAttribute("x2", String(chartSvgBounds.left));
yAxisLineEl.setAttribute("y2", String(chartSvgBounds.bottom));

const xAxisLineEl = makeLineSvgEl(svgEl);
xAxisLineEl.setAttribute("x1", String(chartSvgBounds.left));
xAxisLineEl.setAttribute("y1", String(chartSvgBounds.bottom));
xAxisLineEl.setAttribute("x2", String(chartSvgBounds.right));
xAxisLineEl.setAttribute("y2", String(chartSvgBounds.bottom));

const TICK_LENGTH = 5;
const LABEL_SIZE = 10;
// Draw chart x Axis
const X_AXIS_TICK_DATA_DISTANCE = 1;
for (
  let x = chartDataBounds.xAxisMin;
  x <= chartDataBounds.xAxisMax;
  x += X_AXIS_TICK_DATA_DISTANCE
) {
  const tick = svgPointFromDatumPoint([x, 0]);
  const tickEl = makeLineSvgEl(svgEl);
  tickEl.setAttribute("x1", String(tick[0]));
  tickEl.setAttribute("y1", String(tick[1]));
  tickEl.setAttribute("x2", String(tick[0]));
  tickEl.setAttribute("y2", String(tick[1] + TICK_LENGTH));

  const discreteLine = makeLineSvgEl(svgEl);
  discreteLine.setAttribute("x1", String(tick[0]));
  discreteLine.setAttribute("y1", String(tick[1]));
  discreteLine.setAttribute("x2", String(tick[0]));
  discreteLine.setAttribute("y2", String(chartSvgBounds.top));
  discreteLine.setAttribute("style", "stroke: #ddd");

  const text = document.createElementNS(svgEl.namespaceURI, "text");
  svgEl.prepend(text);
  text.setAttribute("x", String(tick[0]));
  text.setAttribute("y", String(tick[1] + TICK_LENGTH + LABEL_SIZE));
  text.setAttribute("text-anchor", "middle");
  text.textContent = String(x);
}

// Draw chart y Axis
const Y_AXIS_TICK_DATA_DISTANCE = 10;
for (
  let y = chartDataBounds.yAxisMin;
  y <= chartDataBounds.yAxisMax;
  y += Y_AXIS_TICK_DATA_DISTANCE
) {
  const tick = svgPointFromDatumPoint([0, y]);
  const tickEl = makeLineSvgEl(svgEl);
  tickEl.setAttribute("x1", String(tick[0]));
  tickEl.setAttribute("y1", String(tick[1]));
  tickEl.setAttribute("x2", String(tick[0] - 5));
  tickEl.setAttribute("y2", String(tick[1]));

  const text = document.createElementNS(svgEl.namespaceURI, "text");
  svgEl.prepend(text);
  text.setAttribute("x", String(tick[0] - 10));
  text.setAttribute("y", String(tick[1]));
  text.setAttribute("text-anchor", "end");
  text.setAttribute("dominant-baseline", "middle");
  text.textContent = String(y);
}

/*****************
 * Data to chart coordinates Conversion functions
 ***************/
// Issue: functions don't work properly if chart is resized

function convertPointBetweenRanges(
  sourceMin: number,
  sourceMax: number,
  targetMin: number,
  targetMax: number,
  v: number
) {
  const sourceSize = sourceMax - sourceMin;
  const targetSize = targetMax - targetMin;

  return ((v - sourceMin) / sourceSize) * targetSize + targetMin;
}

export function svgPointFromDatumPoint([x, y]: [number, number]): [
  number,
  number
] {
  return [
    convertPointBetweenRanges(
      chartDataBounds.xAxisMin,
      chartDataBounds.xAxisMax,
      chartSvgBounds.left,
      chartSvgBounds.right,
      x
    ),
    convertPointBetweenRanges(
      chartDataBounds.yAxisMin,
      chartDataBounds.yAxisMax,

      chartSvgBounds.bottom,
      chartSvgBounds.top,
      y
    ),
  ];
}
export function datumPointFromSvgPoint([x, y]: [number, number]): [
  number,
  number
] {
  return [
    convertPointBetweenRanges(
      chartSvgBounds.left,
      chartSvgBounds.right,
      chartDataBounds.xAxisMin,
      chartDataBounds.xAxisMax,
      x
    ),
    convertPointBetweenRanges(
      chartSvgBounds.bottom,
      chartSvgBounds.top,

      chartDataBounds.yAxisMin,
      chartDataBounds.yAxisMax,
      y
    ),
  ];
}

/*****************
 * SVG helper functions
 ***************/
function makeRectSvgEl(svgEl: SVGElement) {
  const rect = document.createElementNS(svgEl.namespaceURI, "rect");
  rect.setAttribute("fill", "gray");

  svgEl.prepend(rect);
  return rect;
}

function makeLineSvgEl(svgEl: SVGElement) {
  const line = document.createElementNS(svgEl.namespaceURI, "line");
  line.setAttribute("stroke-width", "1");
  line.setAttribute("stroke", "black");
  line.setAttribute("stroke-linecap", "round");

  svgEl.prepend(line);
  return line;
}

function makeCircleSvgEl(svgEl: SVGElement) {
  const circle = document.createElementNS(svgEl.namespaceURI, "circle");
  circle.setAttribute("r", "4");
  circle.setAttribute("fill", "black");

  svgEl.append(circle);
  return circle;
}

/*****************
 * Unused code for smoothly interpolating between discrete coordinates
 ***************/

// function animate() {
//   requestAnimationFrame(animate);
//   interpCirclePos[0] += (circlePos[0] - interpCirclePos[0]) / 3;
//   interpCirclePos[1] = circlePos[1];
//   circleEl.setAttribute("cx", String(interpCirclePos[0]));
//   circleEl.setAttribute("cy", String(interpCirclePos[1]));
// }
// animate();
