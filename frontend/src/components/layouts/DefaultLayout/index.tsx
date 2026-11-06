import {Outlet} from "react-router";
import {Header} from "../../common/Header";
import {Container} from "@mantine/core";
import {GlobalMenu} from "../../common/GlobalMenu";
import ImpersonationBanner from "../../common/ImpersonationBanner";
import PendingDeletionBanner from "../../common/PendingDeletionBanner";
import AnnouncementDisplay from "../../common/AnnouncementDisplay";
import {PoweredByFooter} from "../../common/PoweredByFooter";

const DefaultLayout = () => {
    return (
        <>
            <ImpersonationBanner />
            <PendingDeletionBanner />
            <AnnouncementDisplay />
            <Header rightContent={<GlobalMenu/>}/>
            <Container>
                <Outlet/>
                <PoweredByFooter style={{paddingBottom: '24px'}}/>
            </Container>
        </>
    );
}

export default DefaultLayout;
