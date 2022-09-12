import { JSX, RefObject } from "preact";
import { memo, forwardRef } from "preact/compat";
import "./button.scss";

export interface ButtonProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  type?: string;
  btnRef?: RefObject<HTMLButtonElement>;
}

const Button = memo((props: ButtonProps) => {
  let cls = "cuby-button";
  if (props.type === "primary") {
    cls += " primary";
    delete props.type;
  }
  const { btnRef, ...restProps } = props;
  return <button className={cls} ref={btnRef} {...restProps} />;
});

const RefButton = forwardRef(
  (props: ButtonProps, ref: RefObject<HTMLButtonElement>) => (
    <Button {...props} btnRef={ref} />
  ),
);

export default RefButton;
