import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { Public } from '../../../common/decorators/public.decorator.js';
import { ContactSubmissionResponseDto, CreateContactMessageDto } from '../dto/contact.dto.js';
import { ContactService } from '../services/contact.service.js';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly service: ContactService) {}

  @Post()
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } })
  @ApiOperation({ summary: 'Submit a customer-care message' })
  @ApiOkResponse({ type: ContactSubmissionResponseDto })
  submit(@Body() input: CreateContactMessageDto): Promise<ContactSubmissionResponseDto> {
    return this.service.submit(input);
  }
}
