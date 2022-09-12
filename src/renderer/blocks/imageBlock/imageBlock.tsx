import { type EditorController } from "blocky-core";
import { BlockElement, Changeset } from "blocky-data";
import { DefaultBlockOutline } from "blocky-preact";
import { useState, useEffect, useRef, useCallback } from "preact/hooks";
import Button from "@pkg/renderer/components/button";
import { getBlob, selectAndUploadImageMessage } from "@pkg/common/message";
import { isString, isUndefined, throttle } from "lodash-es";
import {
  type IDisposable,
  flattenDisposable,
} from "blocky-common/es/disposable";
import Dropdown, {
  type ChildRenderOptions,
} from "@pkg/renderer/components/dropdown";
import AnchorToolbar from "@pkg/renderer/components/anchorToolbar";
import { JSX } from "preact";
import mainController from "@pkg/renderer/mainController";
import { TabsManager } from "@pkg/renderer/view/tabsManager";
import { TabEditor } from "@pkg/renderer/view/tabEditor";
import "./imageBlock.scss";

export const ImageBlockName = "Image";

interface ImageBlockProps {
  controller: EditorController;
  blockElement: BlockElement;
}

function makeObjectUrlDisposable(objURL: string): IDisposable {
  return {
    dispose() {
      console.log("revoke");
      URL.revokeObjectURL(objURL);
    },
  };
}

export function ImageBlock(props: ImageBlockProps) {
  const [imgUrl, setImgUrl] = useState<string | undefined>();
  const disposables = useRef<IDisposable[]>([]);

  const fetchAndDisplay = async (blobId: string) => {
    const blobResp = await getBlob.request({ id: blobId });
    // This method create a URL to store the Blob,
    // The URL is bound to the document.
    const objURL = URL.createObjectURL(new Blob([blobResp.data]));
    disposables.current.push(makeObjectUrlDisposable(objURL));
    setImgUrl(objURL);
  };

  const localUrl = props.blockElement.getAttribute("local");
  const remoteUrl = props.blockElement.getAttribute("remote");
  useEffect(() => {
    if (isString(localUrl)) {
      fetchAndDisplay(localUrl);
    } else {
      setImgUrl(remoteUrl);
    }
  }, [localUrl, remoteUrl]);

  useEffect(() => {
    return () => {
      flattenDisposable(disposables.current).dispose();
    };
  }, []);

  const handleUpload = useCallback(
    throttle(
      async () => {
        const activeTab = mainController.focusedTabId.get();
        if (!activeTab) {
          return;
        }
        const tabsManager = TabsManager.instance;
        if (!tabsManager) {
          return;
        }
        const tab = tabsManager.tabsMap.get(activeTab);
        let ownerId: string;
        if (tab?.activeTab instanceof TabEditor) {
          ownerId = tab.activeTab.docId;
        } else {
          return;
        }
        const resp = await selectAndUploadImageMessage.request({
          ownerId,
        });
        if (isUndefined(resp.id)) {
          return;
        }
        new Changeset(props.controller.state)
          .updateAttributes(props.blockElement, {
            local: resp.id,
          })
          .apply();
      },
      200,
      { leading: true },
    ),
    [],
  );

  const submitLink = useCallback((link: string) => {
    new Changeset(props.controller.state)
      .updateAttributes(props.blockElement, {
        remote: link,
      })
      .apply();
  }, []);

  const renderBlockContent = () => {
    if (typeof imgUrl === "undefined") {
      return (
        <>
          <Button
            onClick={handleUpload}
            type="primary"
            style={{ marginRight: 8 }}
          >
            Upload
          </Button>
          <Dropdown
            overlay={(style: JSX.CSSProperties) => (
              <AnchorToolbar style={style} onSubmitLink={submitLink} />
            )}
          >
            {(props: ChildRenderOptions) => (
              <Button ref={props.ref} onClick={props.show}>
                Embed link
              </Button>
            )}
          </Dropdown>
        </>
      );
    }

    return <img src={imgUrl} alt="" />;
  };

  return (
    <DefaultBlockOutline>
      <div className="blocky-image-block">{renderBlockContent()}</div>
    </DefaultBlockOutline>
  );
}
