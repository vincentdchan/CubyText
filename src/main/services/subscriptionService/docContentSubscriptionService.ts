import logger from "@pkg/main/services/logService";
import { isUndefined } from "lodash-es";
import singleton from "@pkg/main/singleton";
import { pushDocContentChangedMessage } from "@pkg/common/message";
import { changesetToMessage, FinalizedChangeset } from "blocky-data";

export class DocContentSubscriptionService {
  /**
   * doc id -> subId
   */
  #subscriptionMap: Map<string, string[]> = new Map();

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
    logger.info(`Unsubscribed doc content: ${subId}`);
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
      pushDocContentChangedMessage.push(singleton.browserWindow, {
        subId,
        changeset: changesetToMessage(changeset),
      });
    }
    logger.debug(`Broadcast changeset to ${subscriptionList.length} clients`);
  }

  broadcastTrash(docId: string) {
    const subscriptionList = this.#subscriptionMap.get(docId);
    if (!subscriptionList) {
      return;
    }
    for (const subId of subscriptionList) {
      pushDocContentChangedMessage.push(singleton.browserWindow, {
        subId,
        trashed: true,
      });
    }
    logger.debug(`broadcast to ${subscriptionList.length} clients`);
  }
}
