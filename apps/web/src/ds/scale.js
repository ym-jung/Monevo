export function rem(px) {
  return typeof px === "number" ? px / 16 + "rem" : px;
}
