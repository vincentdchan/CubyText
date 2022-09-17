import { pushDocListChanged } from "@pkg/common/message";
import logger from "@pkg/main/services/logService";
import singleton from "@pkg/main/singleton";
import { debounce } from "lodash-es";

export class DocListSubscriptionService {
  #subscriptionSet: Set<string> = new Set();

  subscribe(subId: string) {
    logger.info(`Doc list subscribed by ${subId}`);
    this.#subscriptionSet.add(subId);
  }

  unsubscribe(subId: string) {
    logger.info(`Unsubscribed doc list: ${subId}`);
    this.#subscriptionSet.delete(subId);
  }

  broadcast = debounce(() => {
    for (const subId of this.#subscriptionSet) {
      pushDocListChanged.push(singleton.browserWindow!, { subId });
    }
    logger.debug(
      `Broadcast list change to ${this.#subscriptionSet.size} clients`,
    );
  }, 300);
}
