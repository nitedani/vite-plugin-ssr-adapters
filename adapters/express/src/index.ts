import shrinkRay from '@nitedani/shrink-ray-current';
import defu from 'defu';
import {
  NextFunction,
  Request,
  Response,
  static as expressStatic,
} from 'express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { renderPage } from 'vite-plugin-ssr';
const __dirname = dirname(fileURLToPath(import.meta.url));

export type Middleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => void;
export interface VpsMiddlewareOptions {
  root?: string;
  customPageContext?: (pageContextInit: {
    urlOriginal: string;
    req: Request;
    res: Response;
  }) => Promise<any>;
  serveStaticProps?: Parameters<typeof expressStatic>[1];
}
export const vpsMiddleware = (options?: VpsMiddlewareOptions) => {
  const { root, customPageContext, serveStaticProps } = defu(options, {
    root: join(__dirname, '..', 'client'),
    customPageContext: async pageContextInit => pageContextInit,
  });

  const middlewares: Middleware[] = [];
  if (import.meta.env.PROD) {
    middlewares.push(shrinkRay());
    middlewares.push(expressStatic(root, serveStaticProps));
  }

  middlewares.push(async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }
    const urlOriginal = req.originalUrl;
    const pageContextInit = {
      urlOriginal,
      req,
      res,
    };
    const pageContextMerged = {
      ...pageContextInit,
      ...(await customPageContext(pageContextInit)),
    };
    const pageContext = await renderPage(pageContextMerged);
    const { httpResponse } = pageContext;
    if (!httpResponse) return;
    const { statusCode, contentType } = httpResponse;
    res.status(statusCode).type(contentType);
    httpResponse.pipe(res);
  });
  return middlewares;
};
