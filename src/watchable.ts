/**
 * This file provides a function that wraps a value
 * in a container that allows for watching for changes
 * to that value.
 */

export type WatchableValue<T> = {
  setValue(newV: T);
  getValue(): T;
  onChange(watcher: (newV: T) => any);
};
export const watchableValue = <T>(v: T): WatchableValue<T> => {
  let value = v;
  const watchers = new Set<(newV: T) => any>();

  return {
    setValue(newV) {
      value = newV;
      for (const watcher of watchers) watcher(newV);
    },
    getValue: () => value,
    onChange(watcher) {
      watchers.add(watcher);
    },
  };
};
