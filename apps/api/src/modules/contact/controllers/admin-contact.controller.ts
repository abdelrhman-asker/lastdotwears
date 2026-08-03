import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Roles } from '../../../common/decorators/roles.decorator.js';
import {
  AdminContactListQueryDto,
  ContactMessageResponseDto,
  PaginatedContactMessagesResponseDto,
  UpdateContactMessageDto,
} from '../dto/contact.dto.js';
import { ContactService } from '../services/contact.service.js';

@ApiTags('Admin Contact Inbox')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/contact-messages')
export class AdminContactController {
  constructor(private readonly service: ContactService) {}

  @Get()
  @ApiOkResponse({ type: PaginatedContactMessagesResponseDto })
  list(@Query() query: AdminContactListQueryDto): Promise<PaginatedContactMessagesResponseDto> {
    return this.service.list(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: ContactMessageResponseDto })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<ContactMessageResponseDto> {
    return this.service.get(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ContactMessageResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateContactMessageDto,
  ): Promise<ContactMessageResponseDto> {
    return this.service.update(id, input);
  }
}
