import { useState, useEffect } from "preact/compat";

export interface AutoTopDownProps {
  atTop: boolean;
  length: number;
  heightPerItem: number;
  maxHeight: number;
}

export function useAutoTopDown(props: AutoTopDownProps): string {
  const [offsetTop, setOffsetTop] = useState(0);
  useEffect(() => {
    if (props.atTop) {
      const height = props.length * props.heightPerItem;
      setOffsetTop(Math.max(0, props.maxHeight - height));
    } else {
      setOffsetTop(0);
    }
  }, [props.atTop, props.length]);
  return `translateY(${offsetTop}px)`;
}
