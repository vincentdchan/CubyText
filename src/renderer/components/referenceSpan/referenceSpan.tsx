import { useEffect, useState } from "preact/compat";
import { FontAwesomeIcon } from "@pkg/renderer/components/fontAwesomeIcon";
import { faFileLines } from "@fortawesome/free-solid-svg-icons";
import { isUndefined } from "lodash-es";
import { getDocInfo } from "@pkg/common/message";

export interface ReferenceSpanProps {
  docId?: string;
}

function ReferenceSpan(props: ReferenceSpanProps) {
  const [title, setTitle] = useState<string | undefined>(undefined);

  const fetchDocInfo = async (id: string) => {
    const response = await getDocInfo.request({ ids: [id] });
    const item = response.data[0];
    setTitle(item.title);
  };

  useEffect(() => {
    if (isUndefined(props.docId)) {
      setTitle(undefined);
    } else {
      fetchDocInfo(props.docId);
    }
  }, [props.docId]);

  useEffect(() => {
    return () => console.log("unmount");
  }, []);

  return (
    <>
      <FontAwesomeIcon icon={faFileLines} />
      {isUndefined(title) ? "Loading..." : title || "Untitled document"}
    </>
  );
}

export default ReferenceSpan;
