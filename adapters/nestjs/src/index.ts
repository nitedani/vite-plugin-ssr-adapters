import { DynamicModule, Inject, Module, OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import {
  vpsMiddleware,
  VpsMiddlewareOptions,
} from '@nitedani/vite-plugin-ssr-adapter-express';
const OPTIONS = Symbol.for('vite-plugin-ssr.options');

@Module({})
export class VpsModule implements OnModuleInit {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    @Inject(OPTIONS)
    private readonly viteSsrOptions: VpsMiddlewareOptions
  ) {}

  static forRoot(options?: VpsMiddlewareOptions): DynamicModule {
    return {
      module: VpsModule,
      providers: [{ provide: OPTIONS, useValue: options || {} }],
    };
  }

  async onModuleInit() {
    if (!this.httpAdapterHost) {
      throw new Error(
        'httpAdapterHost is undefined, no decorator metadata available'
      );
    }
    const httpAdapter = this.httpAdapterHost.httpAdapter;
    if (!httpAdapter) {
      return;
    }
    const app = httpAdapter.getInstance();
    app.use(vpsMiddleware(this.viteSsrOptions));
  }
}
