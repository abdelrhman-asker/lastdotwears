import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';

const passwordHashOptions = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

@Injectable()
export class PasswordService {
  private readonly dummyHash = argon2.hash(
    'Dummy-password-value-which-is-never-a-user-password-42!',
    passwordHashOptions,
  );

  hash(password: string): Promise<string> {
    return argon2.hash(password, passwordHashOptions);
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(passwordHash, password);
    } catch {
      return false;
    }
  }

  async verifyDummy(password: string): Promise<void> {
    await this.verify(await this.dummyHash, password);
  }
}
