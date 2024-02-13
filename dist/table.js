/**
 * Creates a table element with 2 columns labelled x and y
 * @param title The label at the top the table, spans 2 columns
 */
export const createTableEl = (title) => {
    const tableEl = document.createElement("table");
    document.querySelector(".container").append(tableEl);
    const titleTrEl = document.createElement("tr");
    tableEl.append(titleTrEl);
    const titleThEl = document.createElement("th");
    titleThEl.textContent = title;
    titleThEl.colSpan = 2;
    tableEl.append(titleThEl);
    const trEl = document.createElement("tr");
    tableEl.append(trEl);
    const thEl1 = document.createElement("th");
    thEl1.textContent = "x";
    tableEl.append(thEl1);
    const thEl2 = document.createElement("th");
    tableEl.append(thEl2);
    thEl2.textContent = "y";
    return tableEl;
};
/**
 * Adds a row to a table that is synchronized with a WatchableValue.
 * If the value changes, so will the table.
 * @param tableEl
 * @param datum
 */
export const addTableRowEl = (tableEl, datum) => {
    const trEl = document.createElement("tr");
    const tdEl1 = document.createElement("td");
    const tdEl2 = document.createElement("td");
    const sync = ({ value, highlighted }) => {
        tdEl1.textContent = value[0].toFixed(0);
        tdEl2.textContent = value[1].toFixed(0);
        trEl.style.backgroundColor = highlighted ? "#eee" : "unset";
    };
    datum.onChange(sync);
    sync(datum.getValue());
    tableEl.append(trEl);
    trEl.append(tdEl1);
    trEl.append(tdEl2);
};
