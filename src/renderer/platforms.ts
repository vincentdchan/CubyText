

export const isMac = navigator.platform.toUpperCase().indexOf('MAC')>=0;
export const isWindows = navigator.platform.toUpperCase().indexOf('WIN')>=0;

export const keys = {
  superKey: "⌘",
  shiftKey: "⇧",
}

if (!isMac) {
  keys.superKey = "Ctrl";
  keys.shiftKey = "Shift"
}
