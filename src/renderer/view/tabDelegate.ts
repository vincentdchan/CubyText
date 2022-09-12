import { Slot } from "blocky-common/es/events";
import { DivContainer } from "blocky-common/es/dom";
import { flattenDisposable, IDisposable } from "blocky-common/es/disposable";
import { Cell } from "blocky-common/es/cell";

export class TabDelegate extends DivContainer {
  readonly focus = new Slot();
  readonly title = new Cell<string>("");
  /**
   * Only used when a document is trashed.
   */
  readonly trashed = new Slot();
  protected disposables: IDisposable[] = [];

  constructor(readonly id: string, clsName?: string) {
    super(clsName);
    this.disposables.push(this.focus, this.title);
  }

  override dispose(): void {
    flattenDisposable(this.disposables).dispose();
    super.dispose();
  }
}
