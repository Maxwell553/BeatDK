export const PAL = {
  sky: "#5C94FC",
  black: "#000000",
  white: "#FCFCFC",
  red: "#D82800",
  brown: "#887000",
  brownDark: "#503000",
  tan: "#FC9838",
  skin: "#FCA044",
  orange: "#E45C10",
  orangeDeep: "#AC7C00",
  brick: "#C84C0C",
  gold: "#F8B800",
  goldDark: "#E09000",
  green: "#00A800",
  greenDark: "#005800",
  greenLight: "#80D010",
  blue: "#2038EC",
  blueDark: "#0000A8",
  blueMid: "#3CBCFC",
  gray: "#BCBCBC",
  grayDark: "#747474",
  grayLight: "#F8F8F8",
  lava: "#F83800",
  lavaHot: "#FCA044",
};

export function worldSky(world, theme) {
  if (theme === "underground" || theme === "castle") return PAL.black;
  if (theme === "underwater") return "#2038EC";
  if (world >= 7) return "#0018A8";
  if (world >= 5) return "#3C38B0";
  if (world >= 3) return "#3060D0";
  return PAL.sky;
}
