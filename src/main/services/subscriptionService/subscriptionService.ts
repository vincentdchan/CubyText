import { lazy } from "blocky-common/es/lazy";
import logger from "@pkg/main/services/logService";
import { isUndefined } from "lodash-es";
import singleton from "@pkg/main/singleton";
import { pushSubscriptionMessage } from "@pkg/common/message";
import { changesetToMessage, FinalizedChangeset } from "blocky-data";

export class SubscriptionService {
  /**
   * doc id -> subId
   */
  #subscriptionMap: Map<string, string[]> = new Map();

  static #init = lazy(() => new SubscriptionService());

  static get(): SubscriptionService {
    return SubscriptionService.#init();
  }

  subscribe(subId: string, docId: string) {
    logger.info(`Doc ${docId} subscribed by ${subId}`);
    const subscriptionList = this.#subscriptionMap.get(docId);
    if (isUndefined(subscriptionList)) {
      this.#subscriptionMap.set(docId, [subId]);
      return;
    }
    subscriptionList.push(subId);
  }

  unsubscribe(subId: string) {
    logger.info(`unsubscribed: ${subId}`);
    const entries = [...this.#subscriptionMap.entries()];
    for (const [docId, subscriptionList] of entries) {
      if (subscriptionList.indexOf(subId) >= 0) {
        const newSubscriptionList = subscriptionList.filter(
          (id) => id !== subId,
        );
        if (newSubscriptionList.length === 0) {
          this.#subscriptionMap.delete(docId);
        } else {
          this.#subscriptionMap.set(docId, newSubscriptionList);
        }
      }
    }
  }

  broadcastChangeset(docId: string, changeset: FinalizedChangeset) {
    const subscriptionList = this.#subscriptionMap.get(docId);
    if (!subscriptionList) {
      return;
    }
    for (const subId of subscriptionList) {
      pushSubscriptionMessage.push(singleton.browserWindow, {
        subId,
        changeset: changesetToMessage(changeset),
      });
    }
    logger.debug(`broadcast to ${subscriptionList.length} clients`);
  }

  broadcastTrash(docId: string) {
    const subscriptionList = this.#subscriptionMap.get(docId);
    if (!subscriptionList) {
      return;
    }
    for (const subId of subscriptionList) {
      pushSubscriptionMessage.push(singleton.browserWindow, {
        subId,
        trashed: true,
      });
    }
    logger.debug(`broadcast to ${subscriptionList.length} clients`);
  }
}
