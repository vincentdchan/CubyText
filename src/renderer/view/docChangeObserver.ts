import {
  subscribeDocChanged,
  unsubscribeDocChanged,
  pushSubscriptionMessage,
  type PushSubscriptionMessage,
} from "@pkg/common/message";
import { Slot } from "blocky-common/es/events";
import {
  type IDisposable,
  flattenDisposable,
} from "blocky-common/es/disposable";
import { FinalizedChangeset, changesetFromMessage } from "blocky-data";
import { isUndefined } from "lodash-es";

export class DocChangeObserver implements IDisposable {
  readonly changesetReceived: Slot<FinalizedChangeset> = new Slot();
  readonly trashed: Slot = new Slot();
  private disposables: IDisposable[] = [];

  constructor(readonly tabId: string, readonly docId: string) {
    this.disposables.push(pushSubscriptionMessage.on(this.#messageHandler));
  }

  #messageHandler = (req: PushSubscriptionMessage) => {
    if (req.subId !== this.tabId) {
      return;
    }
    if (!isUndefined(req.changeset)) {
      this.changesetReceived.emit(changesetFromMessage(req.changeset));
    }
    if (req.trashed) {
      this.trashed.emit();
    }
  };

  async start(): Promise<unknown> {
    return subscribeDocChanged.request({
      subId: this.tabId,
      docId: this.docId,
    });
  }

  async #sendUnsubscribe() {
    try {
      await unsubscribeDocChanged.request({
        subId: this.tabId,
      });
    } catch (err) {
      /**
       * TODO: Report the error
       */
      console.error(err);
    }
  }

  dispose(): void {
    this.changesetReceived.dispose();
    this.trashed.dispose();
    flattenDisposable(this.disposables).dispose();
    this.#sendUnsubscribe();
  }
}
