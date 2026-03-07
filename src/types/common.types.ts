export interface QueryParamsType {
    page?: number;
    pageSize?: number;
    search?: string;
    filters?: any;
    sort?: string | string[];
    populate?: any;
    fields?: string[];
}