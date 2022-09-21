import { autoUpdater, app } from "electron";
import logger from "./services/logService";
import { once } from "lodash-es";

const server = "https://update.electronjs.org";

export const setupAutoUpdate = once(() => {
  logger.info("setupAutoUpdate");
  try {
    const feed = `${server}/OWNER/REPO/${process.platform}-${
      process.arch
    }/${app.getVersion()}`;
    logger.debug("feed url", feed);

    autoUpdater.setFeedURL({
      url: feed,
    });

    setInterval(() => {
      autoUpdater.checkForUpdates();
    }, 10 * 60 * 1000);

    autoUpdater.addListener(
      "update-downloaded",
      (event, releaseNotes, releaseName, releaseDate) => {
        logger.info("update downloaded>>>>>>>>>>");
        logger.info("event", event);
        logger.info("releaseNotes", releaseNotes);
        logger.info("releaseName", releaseName);
        logger.info("releaseDate", releaseDate);
        logger.info("<<<<<<<<<<<<<<<<<<<<<<<<<<<");
      },
    );

    autoUpdater.addListener("error", (error) => {
      logger.error("Update error", error);
    });
  } catch (err) {
    logger.warn("SetupAutoUpdate:", err);
  }
});
