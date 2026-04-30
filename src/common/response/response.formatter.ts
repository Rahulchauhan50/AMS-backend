export const successResponse = (message: string, data: any = {}, meta: any = {}) => {
  return {
    success: true,
    message,
    data,
    meta,
  };
};

export const errorResponse = (message: string, errors: any[] = [], requestId?: string) => {
  return {
    success: false,
    message,
    errors,
    requestId,
  };
};
