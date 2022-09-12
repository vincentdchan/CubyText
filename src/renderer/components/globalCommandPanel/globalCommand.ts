export interface GlobalCommandInitProps {
  key: string;
  title: string;
  onAction?: () => void;
  children?: GlobalCommand[];
}

export class GlobalCommand {
  constructor(readonly options: GlobalCommandInitProps) {}
}
