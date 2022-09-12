/* eslint-disable */
import { createElement, VNode } from "preact";
import { AbstractElement, icon } from "@fortawesome/fontawesome-svg-core";
import normalizeIconArgs from "./normalizeIconArgs";
import camelize from "./camelize";

interface FontAwesomeIconProps {
  beat: boolean;
  border: boolean;
  bounce: boolean;
  className: string;
  fade: boolean;
  flash?: boolean;
  mask?: Object | Array<any> | string;
  maskId?: string;
  fixedWidth: boolean;
  inverse: boolean;
  flip?: "horizontal" | "vertical" | "both";
  icon?: Object | Array<any> | string;
  listItem: boolean;
  pull?: "right" | "left";
  pulse: boolean;
  rotation?: number;
  shake: boolean;
  size?:
    | "2xs"
    | "xs"
    | "sm"
    | "lg"
    | "xl"
    | "2xl"
    | "1x"
    | "2x"
    | "3x"
    | "4x"
    | "5x"
    | "6x"
    | "7x"
    | "8x"
    | "9x"
    | "10x";
  spin: boolean;
  spinPluse?: boolean;
  spinReverse?: boolean;
  symbol: boolean | string;
  title: string;
  titleId?: string;
  transform?: string | Object;
  style?: JSX.CSSProperties;
  swapOpacity: boolean;
}

const defaultProps: FontAwesomeIconProps = {
  border: false,
  className: "",
  fixedWidth: false,
  inverse: false,
  listItem: false,
  pulse: false,
  spin: false,
  beat: false,
  fade: false,
  // beatFade: false,
  bounce: false,
  shake: false,
  symbol: false,
  title: "",
  swapOpacity: false,
};

function FontAwesomeIcon(props: Partial<FontAwesomeIconProps>) {
  const localProps: FontAwesomeIconProps = {
    ...props,
    ...defaultProps,
  };

  const { icon: iconArgs, className, style } = localProps;

  const iconLookup = normalizeIconArgs(iconArgs);

  const renderedIcon = icon(iconLookup as any, {
    classes: className,
  });

  if (!renderedIcon) {
    console.error("Could not find icon", iconLookup);
    return null;
  }

  const { abstract } = renderedIcon;
  abstract[0];

  return abstractElemenToPreact(abstract[0], { style });
}

function capitalize(val: string) {
  return val.charAt(0).toUpperCase() + val.slice(1);
}

function styleToObject(style: string) {
  return style
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s)
    .reduce((acc, pair) => {
      const i = pair.indexOf(":");
      const prop = camelize(pair.slice(0, i));
      const value = pair.slice(i + 1).trim();

      prop.startsWith("webkit")
        ? (acc[capitalize(prop)] = value)
        : (acc[prop] = value);

      return acc;
    }, {} as any);
}

interface ExtraProps {
  style?: JSX.CSSProperties;
}

function abstractElemenToPreact(
  element: AbstractElement,
  extraProps: ExtraProps,
): VNode {
  const children: VNode[] = (element.children || []).map((child) => {
    return abstractElemenToPreact(child, extraProps);
  });

  const mixins = Object.keys(element.attributes || {}).reduce(
    (acc: any, key) => {
      const val = element.attributes[key];

      switch (key) {
        case "class":
          acc.attrs["className"] = val;
          delete element.attributes["class"];
          break;
        case "style":
          acc.attrs["style"] = styleToObject(val);
          break;
        default:
          if (key.indexOf("aria-") === 0 || key.indexOf("data-") === 0) {
            acc.attrs[key.toLowerCase()] = val;
          } else {
            acc.attrs[camelize(key)] = val;
          }
      }

      return acc;
    },
    { attrs: {} },
  );

  return createElement(
    element.tag,
    { ...mixins.attrs, ...extraProps },
    ...children,
  );
}

export default FontAwesomeIcon;
