export type PaginationRequest = {
    pageSize: number;
    pageNumber: number;
}

export type PaginationResponse = {
    total: number;
    totalPages: number;
}
