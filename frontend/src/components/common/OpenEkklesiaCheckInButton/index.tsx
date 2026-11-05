import {Button} from "@mantine/core";
import {IconQrcode} from "@tabler/icons-react";
import {t} from "@lingui/macro";
import {IdParam} from "../../../types.ts";
import {useGetDefaultCheckInList} from "../../../queries/useGetDefaultCheckInList.ts";
import {openEkklesiaCheckIn} from "../../../utilites/ekklesiaCheckIn.ts";

interface OpenEkklesiaCheckInButtonProps {
    eventId: IdParam;
    checkInAppUrl: string;
}

export const OpenEkklesiaCheckInButton = ({eventId, checkInAppUrl}: OpenEkklesiaCheckInButtonProps) => {
    const {data: defaultList} = useGetDefaultCheckInList(eventId);

    return (
        <Button
            variant="transparent"
            leftSection={<IconQrcode size={16}/>}
            disabled={!defaultList}
            data-testid="ekklesia-check-in-open-button"
            onClick={() => defaultList && openEkklesiaCheckIn(checkInAppUrl, defaultList.short_id)}
        >
            {t`Open Ekklesia Check-In`}
        </Button>
    );
};
