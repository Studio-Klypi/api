declare namespace Express {
  interface Request {
    user?: Record<string, any>;
    session?: Record<string, any>;
  }
}
