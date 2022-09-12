export interface OutlineNode {
  id: string;
  title: string;
  nodeType: string;
  priority: number;
  children: OutlineNode[];
}
