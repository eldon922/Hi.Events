export const ekklesiaCheckInUrl = (appUrl: string, checkInListShortId: string): string =>
    `${appUrl.replace(/\/+$/, '')}/hi#${checkInListShortId}`;

export const openEkklesiaCheckIn = (appUrl: string, checkInListShortId: string): void => {
    window.open(ekklesiaCheckInUrl(appUrl, checkInListShortId), '_blank', 'noopener,noreferrer');
};
