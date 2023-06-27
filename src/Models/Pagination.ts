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
  request: PaginationRequest,
  records: T[],
  total: number
): PaginationResponse<T> {
  return {
    ...request,
    total,
    totalPages: total === 0 ? 0 : Math.floor(total / request.pageSize) + 1,
    records,
  };
}

export async function queryPaginationResult<T, R>(
  request: PaginationRequest,
  countFunction: (params: R) => Promise<number>,
  queryFuntion: (params: R & { take: number; skip: number }) => Promise<T[]>,
  params: R
): Promise<PaginationResponse<T>> {
  return createPaginationResult(
    request,
    await queryFuntion({
      ...params,
      take: request.pageSize,
      skip: request.page * request.pageSize,
    }),
    await countFunction(params)
  );
}

export async function queryPaginationResultTransform<T, R, S>(
  request: PaginationRequest,
  countFunction: (params: R) => Promise<number>,
  queryFuntion: (params: R & { take: number; skip: number }) => Promise<T[]>,
  params: R,
  transform: (param: T) => S
): Promise<PaginationResponse<S>> {
  return queryPaginationResult(
    request,
    countFunction,
    (p) => queryFuntion(p).then((result) => result.map(transform)),
    params
  );
}
