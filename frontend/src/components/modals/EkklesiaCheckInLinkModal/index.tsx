import {Button, CopyButton, Paper, Stack, Text, TextInput} from "@mantine/core";
import {IconCheck, IconCopy, IconExternalLink} from "@tabler/icons-react";
import QRCode from "react-qr-code";
import {t} from "@lingui/macro";
import {GenericModalProps} from "../../../types.ts";
import {Modal} from "../../common/Modal";
import {ekklesiaCheckInUrl, openEkklesiaCheckIn} from "../../../utilites/ekklesiaCheckIn.ts";

interface EkklesiaCheckInLinkModalProps {
    checkInAppUrl: string;
    checkInListShortId: string;
}

export const EkklesiaCheckInLinkModal = ({
                                             onClose,
                                             checkInAppUrl,
                                             checkInListShortId,
                                         }: GenericModalProps & EkklesiaCheckInLinkModalProps) => {
    const url = ekklesiaCheckInUrl(checkInAppUrl, checkInListShortId);

    return (
        <Modal opened onClose={onClose} heading={t`Ekklesia Check-In link and QR code`} size="sm">
            <Stack gap="md" align="center">
                <Text size="sm">
                    {t`Door staff can open this link or scan this QR code on their phone. Treat it like a shared password.`}
                </Text>

                <Paper bg="white" p="md" withBorder>
                    <QRCode value={url} size={200} level="H" data-testid="ekklesia-check-in-qr-code"/>
                </Paper>

                <TextInput
                    w="100%"
                    value={url}
                    readOnly
                    rightSectionWidth={90}
                    rightSection={
                        <CopyButton value={url}>
                            {({copied, copy}) => (
                                <Button
                                    size="compact-sm"
                                    variant="subtle"
                                    onClick={copy}
                                    leftSection={copied ? <IconCheck size={14}/> : <IconCopy size={14}/>}
                                >
                                    {copied ? t`Copied` : t`Copy`}
                                </Button>
                            )}
                        </CopyButton>
                    }
                />

                <Button
                    variant="light"
                    fullWidth
                    leftSection={<IconExternalLink size={16}/>}
                    onClick={() => openEkklesiaCheckIn(checkInAppUrl, checkInListShortId)}
                >
                    {t`Open Ekklesia Check-In`}
                </Button>
            </Stack>
        </Modal>
    );
};
