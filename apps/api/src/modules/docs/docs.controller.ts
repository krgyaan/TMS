import { Controller, Get } from '@nestjs/common';
import { generateOpenAPIDocument } from '../../docs/openapi';

@Controller('docs-json')
export class DocsController {
  @Get()
  getDocs() {
    return generateOpenAPIDocument();
  }
}

