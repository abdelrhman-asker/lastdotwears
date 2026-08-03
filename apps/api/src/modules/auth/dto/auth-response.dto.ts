import { ApiProperty } from '@nestjs/swagger';

import { UserResponseDto } from '../../users/dto/user.dto.js';

export class AuthenticationResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}

export class MessageResponseDto {
  @ApiProperty()
  message!: string;
}
