import { Slot } from "blocky-common/es/events";
import { isUndefined } from "lodash-es";

export class ObservableFixedSizeStack<T> {
  readonly changed = new Slot();
  #maxLength: number;
  readonly data: T[] = [];

  constructor(maxLength: number) {
    this.#maxLength = maxLength;
  }

  push(value: T): void {
    this.data.push(value);
    if (this.data.length > this.#maxLength) {
      this.data.shift();
    }
    this.changed.emit();
  }

  pop(): void | T {
    const result = this.data.pop();
    if (!isUndefined(result)) {
      this.changed.emit();
    }
    return result;
  }

  get length() {
    return this.data.length;
  }

  get isEmpty() {
    return this.data.length === 0;
  }
}
