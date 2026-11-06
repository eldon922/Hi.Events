import {useQuery} from "@tanstack/react-query";
import {IdParam} from "../types.ts";
import {checkInListClient} from "../api/check-in-list.client.ts";

export const GET_DEFAULT_CHECK_IN_LIST_QUERY_KEY = 'getDefaultCheckInList';

export const useGetDefaultCheckInList = (eventId: IdParam) => {
    return useQuery({
        queryKey: [GET_DEFAULT_CHECK_IN_LIST_QUERY_KEY, eventId],

        queryFn: async () => {
            return await checkInListClient.getDefault(eventId);
        }
    });
};
