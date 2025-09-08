import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';

export function generateOpenAPIDocument() {
  const registry = new OpenAPIRegistry();
  // TODO: register route schemas here via registry.registerPath(...)

  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'API',
      version: '1.0.0',
    },
    servers: [{ url: '/' }],
    paths: {},
  });
}

