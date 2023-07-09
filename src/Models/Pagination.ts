export type PaginationRequest = {
  pageSize: number;
  page: number;
};

export type PaginationResponse<T> = PaginationRequest & {
  total: number;
  totalPages: number;
  records: T[];
};

export function createPaginationResult<T>(
  pagination: PaginationRequest,
  records: T[],
  total: number
): PaginationResponse<T> {
  const totalPages = total === 0 ? 0 : Math.floor(total / pagination.pageSize) + 1;

  return {
    ...pagination,
    total,
    totalPages,
    records,
  };
}


export async function queryPaginationResult<T, R extends { where: any }>(
  pagination: PaginationRequest,
  countFunction: (params: { where: R['where'] }) => Promise<number>,
  queryFunction: (params: R & { take: number; skip: number }) => Promise<T[]>,
  params: R
): Promise<PaginationResponse<T>> {
  const { pageSize, page } = pagination;
  const take = pageSize;
  const skip = page * pageSize;

  const queryResult = await queryFunction({ ...params, take, skip });
  const totalCount = await countFunction({ where: params.where });

  return createPaginationResult(pagination, queryResult, totalCount);
}
