import { DynamicModule, Inject, Module, OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { vike, VikeOptions } from 'vike-adapter-express';
const OPTIONS = Symbol.for('vike.options');

@Module({
  providers: [{ provide: OPTIONS, useValue: {} }],
})
export class VpsModule implements OnModuleInit {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    @Inject(OPTIONS)
    private readonly vikeOptions: VikeOptions
  ) {}

  static forRoot(options?: VikeOptions): DynamicModule {
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
    app.use(vike(this.vikeOptions));
  }
}
