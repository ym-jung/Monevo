import { rem } from "../scale.js";

const CDN = "/icons/";

export function Icon({ name, size = 16, style, ...rest }) {
  const url = 'url("' + CDN + name + '.svg")';
  return (
    <span
      aria-hidden="true"
      {...rest}
      style={{
        display: "inline-block",
        flex: "0 0 auto",
        width: rem(size),
        height: rem(size),
        background: "currentColor",
        WebkitMaskImage: url,
        maskImage: url,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        ...style,
      }}
    />
  );
}
