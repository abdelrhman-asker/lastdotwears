import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import { AddressResponseDto, CreateAddressDto, UpdateAddressDto } from '../dto/address.dto.js';
import { AddressesService } from '../services/addresses.service.js';

@ApiTags('Addresses')
@ApiBearerAuth()
@Roles('CUSTOMER')
@Controller('addresses')
export class AddressesController {
  constructor(private readonly service: AddressesService) {}

  @Get()
  @ApiOperation({ summary: 'List the current customer delivery addresses' })
  @ApiOkResponse({ type: [AddressResponseDto] })
  list(@CurrentUser() user: AuthenticatedUser): Promise<AddressResponseDto[]> {
    return this.service.list(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Save a delivery address' })
  @ApiCreatedResponse({ type: AddressResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateAddressDto,
  ): Promise<AddressResponseDto> {
    return this.service.create(user.id, input);
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Make a saved address the default' })
  @ApiOkResponse({ type: AddressResponseDto })
  setDefault(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AddressResponseDto> {
    return this.service.setDefault(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an owned delivery address' })
  @ApiOkResponse({ type: AddressResponseDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateAddressDto,
  ): Promise<AddressResponseDto> {
    return this.service.update(user.id, id, input);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an owned delivery address' })
  @ApiNoContentResponse()
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.service.remove(user.id, id);
  }
}
