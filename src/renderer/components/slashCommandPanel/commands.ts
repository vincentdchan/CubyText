import TextImage from "./images/text.png";
import HeadingImage from "./images/heading.png";
import ImageImage from "./images/image.png";
import CheckboxImage from "./images/checkbox.png";

export interface CommandCategory {
  key: string;
  content: string;
}

export const basicBlocksCategory: CommandCategory = {
  key: "basic-blocks",
  content: "Basic Blocks",
};

export const advancedBlocksCategory: CommandCategory = {
  key: "advanced-blocks",
  content: "Advanced Blocks",
};

export const actionsCategory: CommandCategory = {
  key: "actions",
  content: "Actions",
};

export const categories: CommandCategory[] = [
  basicBlocksCategory,
  advancedBlocksCategory,
  actionsCategory,
];

export interface CommandOptions {
  showDelete: boolean;
}

export interface OriginalCommands {
  key: string;
  content: string;
  category: CommandCategory;
  imgUrl?: string;
  description?: string;
  color?: string;
  valid?: (options: CommandOptions) => boolean;
}

export const commands: OriginalCommands[] = [
  {
    key: "text",
    content: "Text",
    imgUrl: TextImage,
    description: "A block to input text",
    category: basicBlocksCategory,
  },
  {
    key: "heading1",
    content: "Heading1",
    imgUrl: HeadingImage,
    description: "Big section heading",
    category: basicBlocksCategory,
  },
  {
    key: "heading2",
    content: "Heading2",
    imgUrl: HeadingImage,
    description: "Medium section heading",
    category: basicBlocksCategory,
  },
  {
    key: "heading3",
    content: "Heading3",
    imgUrl: HeadingImage,
    description: "Small section heading",
    category: basicBlocksCategory,
  },
  {
    key: "todo-list",
    content: "To-do list",
    imgUrl: CheckboxImage,
    description: "Track task with a to-do list",
    category: basicBlocksCategory,
  },
  {
    key: "image",
    content: "Image",
    imgUrl: ImageImage,
    description: "Upload or embed a link",
    category: basicBlocksCategory,
  },
  {
    key: "documents-explorer",
    content: "Documents Explorer",
    imgUrl: TextImage,
    description: "A list view to explore the documents",
    category: advancedBlocksCategory,
  },
  {
    key: "delete",
    content: "Delete",
    color: "var(--app-danger-color)",
    valid: (options: CommandOptions) => options.showDelete,
    category: actionsCategory,
  },
];
