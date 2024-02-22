import { addPlotPoint } from "./plot.js";
import { addTableRowEl, createTableEl } from "./table.js";
import { watchableValue } from "./watchable.js";
/**
 * Creates a piece of data that is synchronized between a plot and table
 *
 * @param data
 * @param tableEl
 * @param datum
 */
const addSyncedDatum = (data, tableEl, datum) => {
    const v = watchableValue(datum);
    data.values.push(v);
    addTableRowEl(tableEl, v);
    addPlotPoint(v, data.color);
};
// create some example data
const dataTableEl1 = createTableEl("data 1");
const data1 = { color: "red", values: [] };
addSyncedDatum(data1, dataTableEl1, { value: [2, 2], highlighted: false });
addSyncedDatum(data1, dataTableEl1, { value: [3, 3], highlighted: false });
export const compareData = [data1];
let COLOR_PRESETS = ["blue", "YellowGreen", "orange", "teal"];
let n = 2;
document.getElementById("clickme")?.addEventListener("click", (e) => {
    const dataTableEl2 = createTableEl(`data ${n++}`);
    const data2 = { color: COLOR_PRESETS[n - 3], values: [] };
    for (let i = 0; i < 7; i++)
        addSyncedDatum(data2, dataTableEl2, {
            value: [Math.round(Math.random() * 9), Math.random() * 150],
            highlighted: false,
        });
    compareData.push(data2);
});
