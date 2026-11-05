import {api} from "./client";
import {
    CheckInList,
    CheckInListRequest,
    GenericDataResponse,
    GenericPaginatedResponse,
    IdParam,
    QueryFilters,
} from "../types";
import {queryParamsHelper} from "../utilites/queryParamsHelper.ts";

export const checkInListClient = {
    create: async (eventId: IdParam, checkInList: CheckInListRequest) => {
        const response = await api.post<GenericDataResponse<CheckInList>>(`events/${eventId}/check-in-lists`, checkInList);
        return response.data;
    },
    update: async (eventId: IdParam, checkInListId: IdParam, checkInList: CheckInListRequest) => {
        const response = await api.put<GenericDataResponse<CheckInList>>(`events/${eventId}/check-in-lists/${checkInListId}`, checkInList);
        return response.data;
    },
    all: async (eventId: IdParam, pagination: QueryFilters | null = null) => {
        const paginationQuery = (pagination) ? queryParamsHelper.buildQueryString(pagination as QueryFilters) : '';
        const response = await api.get<GenericPaginatedResponse<CheckInList>>(`events/${eventId}/check-in-lists` + paginationQuery);
        return response.data;
    },
    getDefault: async (eventId: IdParam) => {
        const response = await api.get<GenericPaginatedResponse<CheckInList>>(`events/${eventId}/check-in-lists`, {
            params: {per_page: 1, sort_by: 'created_at', sort_direction: 'asc'},
        });
        return response.data.data.find(list => list.is_system_default) ?? null;
    },
    get: async (eventId: IdParam, checkInListId: IdParam) => {
        const response = await api.get<GenericDataResponse<CheckInList>>(`events/${eventId}/check-in-lists/${checkInListId}`);
        return response.data;
    },
    delete: async (eventId: IdParam, checkInListId: IdParam) => {
        const response = await api.delete<GenericDataResponse<CheckInList>>(`events/${eventId}/check-in-lists/${checkInListId}`);
        return response.data;
    },
}
