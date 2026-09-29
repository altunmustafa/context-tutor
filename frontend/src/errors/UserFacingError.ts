export const DEFAULT_USER_FACING_ERROR_MESSAGE = "Something went wrong. Try again.";

export class UserFacingError extends Error {
  constructor(message: string = DEFAULT_USER_FACING_ERROR_MESSAGE, options?: ErrorOptions) {
    super(message || DEFAULT_USER_FACING_ERROR_MESSAGE, options);
    this.name = "UserFacingError";
  }
}
