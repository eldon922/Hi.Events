import {Outlet} from "react-router";
import {PoweredByFooter} from "../../common/PoweredByFooter";

const WelcomeLayout = () => {
    return (
        <>
            <Outlet/>
            <PoweredByFooter style={{paddingBottom: '24px'}}/>
        </>
    );
}

export default WelcomeLayout;
