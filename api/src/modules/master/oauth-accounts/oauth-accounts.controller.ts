import { Body, Controller, Get, Post } from '@nestjs/common';
import { z } from 'zod';
import { OauthAccountsService } from './oauth-accounts.service';

const CreateOauthAccountSchema = z.object({
  userId: z.number(),
  provider: z.string().min(1),
  providerUserId: z.string().min(1),
  providerEmail: z.string().email().optional(),
  avatar: z.string().optional(),
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional(),
  scopes: z.string().optional(),
  rawPayload: z.any().optional(),
});

type CreateOauthAccountDto = z.infer<typeof CreateOauthAccountSchema>;

@Controller('oauth-accounts')
export class OauthAccountsController {
  constructor(private readonly oauthAccountsService: OauthAccountsService) {}

  @Get()
  async list() {
    return this.oauthAccountsService.findAll();
  }

  @Post()
  async create(@Body() body: unknown) {
    const parsed = CreateOauthAccountSchema.parse(body);
    if (parsed.expiresAt) {
      parsed.expiresAt = new Date(parsed.expiresAt) as any;
    }
    return this.oauthAccountsService.create(parsed as any);
  }
}
