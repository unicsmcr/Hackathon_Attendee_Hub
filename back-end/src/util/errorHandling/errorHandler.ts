import { Request, Response } from "express";
import { ApiError } from "./";
import { HttpResponseCode } from "./";
import { NextFunction } from "connect";

/**
 * Handles errors thrown by requests
 */
export const errorHandler = (err: ApiError|Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof Error) {
    // TODO: send notification to admins when an uncaught error occurs
    res.status(HttpResponseCode.INTERNAL_ERROR).send(new ApiError(HttpResponseCode.INTERNAL_ERROR, err.message));
    console.error(err.stack);
  } else {
    res.status(err.statusCode).send(err);
  }
};

/**
 * Handles 404 errors
 */
export const error404Handler = (req: Request, res: Response) => {
  const error: ApiError = new ApiError(HttpResponseCode.NOT_FOUND);
  res.status(error.statusCode).send(error);
};
