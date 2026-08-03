import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import { requestMetadata } from '../../auth/utils/request.util.js';
import {
  ListCustomersQueryDto,
  PaginatedUsersResponseDto,
  SetCustomerStatusDto,
  UserResponseDto,
} from '../dto/user.dto.js';
import { UsersService } from '../services/users.service.js';

@ApiTags('Admin Customers')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List customer accounts' })
  @ApiOkResponse({ type: PaginatedUsersResponseDto })
  list(@Query() query: ListCustomersQueryDto): Promise<PaginatedUsersResponseDto> {
    return this.usersService.listCustomers(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a customer account' })
  @ApiOkResponse({ type: UserResponseDto })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return this.usersService.getCustomerById(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Block or unblock a customer account' })
  @ApiOkResponse({ type: UserResponseDto })
  setStatus(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: SetCustomerStatusDto,
    @Req() request: Request,
  ): Promise<UserResponseDto> {
    return this.usersService.setCustomerStatus(actor, id, input, requestMetadata(request));
  }
}
