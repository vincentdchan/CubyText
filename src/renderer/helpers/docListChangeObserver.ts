import {
  subscribeDocListChanged,
  unsubscribeDocListChanged,
  pushDocListChanged,
} from "@pkg/common/message";
import { Slot } from "blocky-common/es/events";
import {
  type IDisposable,
  flattenDisposable,
} from "blocky-common/es/disposable";

export class DocListChangeObserver implements IDisposable {
  readonly updated: Slot = new Slot();
  private disposables: IDisposable[] = [];

  constructor(readonly subId: string) {
    this.disposables.push(pushDocListChanged.on(this.#messageHandler));
  }

  #messageHandler = () => this.updated.emit();

  async start(): Promise<unknown> {
    return subscribeDocListChanged.request({
      subId: this.subId,
    });
  }

  async #sendUnsubscribe() {
    try {
      await unsubscribeDocListChanged.request({
        subId: this.subId,
      });
    } catch (err) {
      /**
       * TODO: Report the error
       */
      console.error(err);
    }
  }

  dispose() {
    flattenDisposable(this.disposables).dispose();
    this.#sendUnsubscribe();
  }
}
