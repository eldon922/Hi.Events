import {ReactNode, Ref, useEffect} from "react";
import {HomepageThemeSettings} from "../../../types.ts";
import {SheetWidth} from "../../../constants/eventLayouts.ts";
import {homepageThemeStyle} from "../../../utilites/themeUtils.ts";
import {removeTransparency} from "../../../utilites/colorHelper.ts";
import {ensureHomepageFontLoaded} from "../../../utilites/fontLoader.ts";
import {PoweredByFooter} from "../../common/PoweredByFooter";
import {CookieSettingsLink} from "../../common/CookieSettingsLink";
import classes from "./HomepageFrame.module.scss";

interface HomepageFrameProps {
    themeSettings: HomepageThemeSettings;
    mirrorImageUrl?: string | null;
    footerRef?: Ref<HTMLElement>;
    brandingRemoved?: boolean;
    width?: SheetWidth;
    header?: ReactNode;
    outside?: ReactNode;
    children: ReactNode;
}

export const HomepageFrame = ({themeSettings, mirrorImageUrl, footerRef, brandingRemoved, width = 'wide', header, outside, children}: HomepageFrameProps) => {
    useEffect(() => {
        ensureHomepageFontLoaded(themeSettings.font_family);
    }, [themeSettings.font_family]);

    const mirrorImage = themeSettings.background_type === 'MIRROR_COVER_IMAGE' ? mirrorImageUrl : null;

    return (
        <main className={classes.page} style={homepageThemeStyle(themeSettings)} data-mode={themeSettings.mode} data-width={width}>
            <style>
                {`
                    body, .ssr-loader {
                        background-color: ${removeTransparency(themeSettings.background)} !important;
                    }
                `}
            </style>
            <div
                className={classes.backdrop}
                aria-hidden="true"
                data-mirror={mirrorImage ? '' : undefined}
                style={mirrorImage ? {backgroundImage: `url(${mirrorImage})`} : undefined}
            />
            {header}
            <div className={classes.shell}>
                <article className={classes.sheet}>
                    {children}
                    <HomepageFooter footerRef={footerRef} brandingRemoved={brandingRemoved}/>
                </article>
            </div>
            {outside}
        </main>
    );
};

const HomepageFooter = ({footerRef, brandingRemoved}: { footerRef?: Ref<HTMLElement>, brandingRemoved?: boolean }) => (
    <footer ref={footerRef} className={classes.footer}>
        <PoweredByFooter className={classes.poweredBy} brandingRemoved={brandingRemoved}/>
        <div className={classes.footerLinks}>
            <CookieSettingsLink className={classes.footerLink}/>
        </div>
    </footer>
);
