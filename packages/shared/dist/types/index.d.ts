import type { ErrorCode } from "../errors/codes";
export interface ApiErrorResponse {
    error: {
        code: ErrorCode | string;
        message: string;
        requestId?: string;
        fields?: Record<string, string[]>;
    };
}
export interface ApiSuccessResponse<T> {
    data: T;
}
export type Paginated<T> = {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
};
//# sourceMappingURL=index.d.ts.map