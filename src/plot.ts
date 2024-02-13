import { Data, Datum, compareData } from "./script.js";
import { distance } from "./vec2.js";
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
  xAxisMax: 10,
  xAxisDiscete: true,
  yAxisMin: 0,
  yAxisMax: 100,
  yAxisDiscrete: false,
};

/**
 *
 * @param dataPoint When this value changes, it is re-plotted in the plot
 * @param color color of the point
 */
export function addPlotPoint(
  dataPoint: WatchableValue<Datum>,
  color: string = "black"
) {
  const circleEl = makeCircleSvgEl(svgEl);

  const sync = ({ value, highlighted }) => {
    const convertedV = svgPointFromDatumPoint(value);
    circleEl.setAttribute("cx", String(convertedV[0]));
    circleEl.setAttribute("cy", String(convertedV[1]));
    circleEl.setAttribute(
      "style",
      `fill: ${color}; stroke: black; r: ${highlighted ? 7 : 5}`
    );
  };

  dataPoint.onChange(sync);
  sync(dataPoint.getValue());
}

/*****************
 * Input handling
 ***************/

const DATUM_HOVER_RADIUS = 10;

let grabbing: null | WatchableValue<Datum> = null;
const MOUSE_EVENT_LEFT_BUTTON = 1;
let mouse = [0, 0] as [number, number];

svgEl.addEventListener("mousedown", (e) => {
  // if mouse is close to point, grab it
  if (e.buttons === MOUSE_EVENT_LEFT_BUTTON) {
    const dataCloseToMouse = dataCloseToPoint(compareData, mouse);
    // TODO: add functionality to click through to select points behind the 0th point
    if (dataCloseToMouse[0]) {
      grabbing = dataCloseToMouse[0];
      e.preventDefault();
    }
  }
});

svgEl.addEventListener("mouseup", (e) => {
  grabbing = null;
});
svgEl.addEventListener("mousemove", (e) => {
  mouse = [e.offsetX, e.offsetY];

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
  return allData.flatMap((data) =>
    data.values.filter(
      (datum) =>
        distance(point, svgPointFromDatumPoint(datum.getValue().value)) <
        DATUM_HOVER_RADIUS
    )
  );
}
function dataNotCloseToPoint(
  allData: Data[],
  point: [number, number]
): WatchableValue<Datum>[] {
  return allData.flatMap((data) =>
    data.values.filter(
      (datum) =>
        distance(point, svgPointFromDatumPoint(datum.getValue().value)) >=
        DATUM_HOVER_RADIUS
    )
  );
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
