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
import { renderPage } from 'vike/server';
const __dirname = dirname(fileURLToPath(import.meta.url));

export type Middleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => void;
export type PageContextInit = {
  urlOriginal: string;
  req: Request;
  res: Response;
};
export interface VikeOptions {
  root?: string;
  customPageContext?: (pageContextInit: PageContextInit) => Promise<any>;
  serveStaticProps?: Parameters<typeof expressStatic>[1];
  compress?: boolean;
  cache?: boolean;
}

export const vike = (options?: VikeOptions) => {
  const { root, customPageContext, serveStaticProps, cache, compress } = defu(
    options,
    {
      root: join(__dirname, '..', 'client'),
      customPageContext: pageContextInit => pageContextInit,
      compress: true,
      cache: true,
    }
  );

  const middlewares: Middleware[] = [];
  if (import.meta.env?.PROD || process.env.NODE_ENV === 'production') {
    if (compress) {
      middlewares.push(
        shrinkRay({
          cacheSize: cache ? '128mB' : false,
        })
      );
    }

    middlewares.push(expressStatic(root, serveStaticProps));
  }

  middlewares.push(async (req, res: Response, next) => {
    if (req.method !== 'GET') {
      return next();
    }
    const urlOriginal = req.originalUrl;
    const pageContextInit = {
      urlOriginal,
      req,
      res,
      userAgent: req.headers['user-agent']
    };
    const pageContextMerged = {
      ...pageContextInit,
      ...(await customPageContext(pageContextInit)),
    };
    const pageContext = await renderPage(pageContextMerged);
    const { httpResponse } = pageContext;
    if (!httpResponse) return;
    const { statusCode, headers, earlyHints } = httpResponse;
    if (res.writeEarlyHints)
      res.writeEarlyHints({ link: earlyHints.map(e => e.earlyHintLink) });
    headers.forEach(([name, value]) => res.setHeader(name, value));
    res.status(statusCode);
    httpResponse.pipe(res);
  });
  return middlewares;
};
