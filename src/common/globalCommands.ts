export interface GlobalCommand {
  key: string;
  title: string;
}

const globalCommands: GlobalCommand[] = [
  {
    key: "reload-window",
    title: "Reload Window",
  },
];

export default globalCommands;
