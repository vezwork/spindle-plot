/**
 * This file provides a function that wraps a value
 * in a container that allows for watching for changes
 * to that value.
 */
export const watchableValue = (v) => {
    let value = v;
    const watchers = new Set();
    return {
        setValue(newV) {
            value = newV;
            for (const watcher of watchers)
                watcher(newV);
        },
        getValue: () => value,
        onChange(watcher) {
            watchers.add(watcher);
        },
    };
};
