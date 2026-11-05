import {Anchor} from "@mantine/core";
import {t} from "@lingui/macro";
import classNames from "classnames";
import {getConfig} from "../../../utilites/config.ts";
import classes from "./LegalLinks.module.scss";

interface LegalLinksProps {
    className?: string;
    linkClassName?: string;
}

export const LegalLinks = ({className, linkClassName}: LegalLinksProps) => {
    const links = [
        {label: t`Terms of Service`, url: getConfig('VITE_TOS_URL')},
        {label: t`Privacy Policy`, url: getConfig('VITE_PRIVACY_URL')},
        {label: t`Organizer Terms`, url: getConfig('VITE_ORGANIZER_TERMS_URL')},
        {label: t`Community Guidelines`, url: getConfig('VITE_COMMUNITY_GUIDELINES_URL')},
        {label: t`Contact and Complaints`, url: getConfig('VITE_CONTACT_URL')},
    ].filter(link => link.url);
    const companyInfo = getConfig('VITE_COMPANY_INFO');

    if (links.length === 0 && !companyInfo) {
        return null;
    }

    return (
        <div className={classNames(classes.legalLinks, className)} data-testid="legal-links">
            {links.map(link => (
                <Anchor
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={classNames(classes.link, linkClassName)}
                >
                    {link.label}
                </Anchor>
            ))}
            {companyInfo && <span className={classes.companyInfo}>{companyInfo}</span>}
        </div>
    );
};
