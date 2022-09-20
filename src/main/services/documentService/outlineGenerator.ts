import {
  type BlockyDocument,
  BlockElement,
  BlockyNode,
  textTypePrecedence,
} from "blocky-data";
import { isObject, isString, isUndefined } from "lodash-es";
import type { OutlineNode } from "@pkg/common/outlineTree";
import { DocumentService } from "@pkg/main/services/documentService";
import { DocumentState } from "./documentState";

export interface OutlineGeneratorOptions {
  document: BlockyDocument;
  documentService: DocumentService;
  referencesCollector?: OutlineNode[];
}

export class OutlineGenerator {
  #nodeStack: OutlineNode[] = [];
  readonly document: BlockyDocument;
  readonly documentService: DocumentService;
  constructor(readonly options: OutlineGeneratorOptions) {
    this.document = options.document;
    this.documentService = options.documentService;
  }

  get title(): string {
    return this.document.title.getTextModel("textContent")?.toString() ?? "";
  }

  static formState(
    documentState: DocumentState,
    documentService: DocumentService,
    referencesCollector?: OutlineNode[],
  ) {
    const generator = new OutlineGenerator({
      document: documentState.state.document,
      documentService,
      referencesCollector,
    });
    return generator.generate();
  }

  generate(): OutlineNode {
    this.#nodeStack.push({
      id: "title",
      title: this.title || "Untitled document",
      priority: 0,
      nodeType: "normal",
      children: [],
    });
    this.#generateHeadingOutline(this.document.body);
    return this.#nodeStack[0];
  }

  #generateHeadingOutline(container: BlockyNode) {
    let ptr = container.firstChild;
    while (ptr) {
      if (ptr instanceof BlockElement && ptr.nodeName === "Text") {
        const textType = ptr.getAttribute("textType");
        const precedence = textTypePrecedence(textType);
        if (isString(textType) && precedence > 0) {
          const title = ptr.getTextModel("textContent")?.toString();
          if (title) {
            // filter the empty title
            let topNode = this.#nodeStack[this.#nodeStack.length - 1];

            const newNode: OutlineNode = {
              id: ptr.id,
              title,
              priority: precedence,
              nodeType: textType,
              children: [],
            };

            if (precedence < topNode.priority) {
              topNode = this.#popToPriority(precedence);
            }

            if (precedence === topNode.priority) {
              const parent = this.#nodeStack[this.#nodeStack.length - 2];
              parent.children.push(newNode);
              this.#nodeStack[this.#nodeStack.length - 1] = newNode;
            } else if (precedence > topNode.priority) {
              this.#nodeStack.push(newNode);
              topNode.children.push(newNode);
            }
          }
        } else {
          this.#findReferences(ptr);
        }
      }
      ptr = ptr.nextSibling;
    }
  }

  #findReferences(blockElement: BlockElement) {
    const textModel = blockElement.getTextModel("textContent");
    if (!textModel) {
      return;
    }
    for (const op of textModel.delta.ops) {
      if (isObject(op.insert)) {
        if (op.insert.type === "reference") {
          const topNode = this.#nodeStack[this.#nodeStack.length - 1];
          const id = op.insert.docId as string;

          // TODO(optimize): batch query
          const title = this.documentService.getDocTitle(id);
          if (isUndefined(title)) {
            continue;
          }

          const newNode: OutlineNode = {
            id: "Ref-" + id,
            title,
            priority: -100,
            nodeType: "reference",
            children: [],
          };
          const result = this.#pushIfNotExist(topNode.children, newNode);
          if (result && this.options.referencesCollector) {
            this.options.referencesCollector.push(newNode);
          }
        }
      }
    }
  }

  #pushIfNotExist(outlines: OutlineNode[], newNode: OutlineNode): boolean {
    const exist = outlines.find((outline) => outline.id === newNode.id);
    if (exist) {
      return false;
    }
    outlines.push(newNode);
    return true;
  }

  #popToPriority(priority: number): OutlineNode {
    while (
      this.#nodeStack.length > 0 &&
      this.#nodeStack[this.#nodeStack.length - 1].priority > priority
    ) {
      this.#nodeStack.pop();
    }
    return this.#nodeStack[this.#nodeStack.length - 1];
  }
}
