import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';

import { Public } from './common/decorators/public.decorator.js';

class ApiInformationDto {
  @ApiProperty({ example: 'Egypt Fashion Commerce API' })
  name!: string;

  @ApiProperty({ example: '0.1.0' })
  version!: string;

  @ApiProperty({ example: 'ok' })
  status!: 'ok';
}

@ApiTags('System')
@Public()
@Controller()
export class AppController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Get API information' })
  @ApiOkResponse({ type: ApiInformationDto })
  information(): ApiInformationDto {
    return {
      name: 'Egypt Fashion Commerce API',
      version: this.configService.getOrThrow<string>('APP_VERSION'),
      status: 'ok',
    };
  }
}
