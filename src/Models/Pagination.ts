export type PaginationRequest = {
    pageSize: number;
    pageNumber: number;
}

export type PaginationResponse = PaginationRequest & {
    total: number;
    totalPages: number;
}
