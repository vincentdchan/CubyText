import { useEffect, useState, useRef } from "preact/compat";
import { type EditorController } from "blocky-core";

export interface SelectableRenderProps {
  index: number;
  setIndex: (index: number) => void;
}

interface SelectablePanelProps {
  controller: EditorController;
  length: number;
  onSelect?: (index: number) => void;
  onClose?: () => void;
}

export function useSelectable(
  props: SelectablePanelProps,
): [number, (index: number) => void] {
  const { controller, length, onSelect, onClose } = props;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const keyboardHandler = useRef<((e: KeyboardEvent) => void) | undefined>(
    undefined,
  );

  useEffect(() => {
    keyboardHandler.current = (e: KeyboardEvent) => {
      let currentIndex = selectedIndex;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (++currentIndex >= length) {
          currentIndex = 0;
        }
        setSelectedIndex(currentIndex);
        return;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (--currentIndex < 0) {
          currentIndex = length - 1;
        }
        setSelectedIndex(currentIndex);
        return;
      } else if (e.key === "Enter") {
        e.preventDefault();
        onSelect?.(currentIndex);
        onClose?.();
        return;
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
        return;
      }
    };
    return () => (keyboardHandler.current = undefined);
  }, [length, onSelect, onClose]);

  useEffect(() => {
    const disposable = controller.editor!.keyDown.on((e: KeyboardEvent) => {
      keyboardHandler.current?.(e);
    });

    return () => disposable.dispose();
  }, []);

  return [selectedIndex, setSelectedIndex];
}
