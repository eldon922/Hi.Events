import {generateColors} from "@mantine/colors-generator";
import {MantineColorsTuple} from "@mantine/core";
import {getConfig} from "./config.ts";

export type ThemeColors = Record<"primary" | "secondary", MantineColorsTuple>;

export const generateThemeColors = (): ThemeColors => ({
    primary: generateColors(getConfig("VITE_APP_PRIMARY_COLOR") as string),
    secondary: generateColors(getConfig("VITE_APP_SECONDARY_COLOR") as string),
});
