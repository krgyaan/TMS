import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { PublicLinkService, type PublicNotifyClaims, type PublicNotifyEntityType } from "./public-link.service";
import { ENTITY_RESOLVERS, type EntityResolver, type PublicEntityDto } from "./entity-resolvers";

export interface PublicNotificationResponse {
    type: PublicNotifyEntityType;
    event: string | null;
    entity: PublicEntityDto;
}

@Injectable()
export class PublicNotificationsService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly publicLink: PublicLinkService,
        @Inject(ENTITY_RESOLVERS) private readonly resolvers: Record<string, EntityResolver>
    ) {}

    async getByToken(token: string): Promise<PublicNotificationResponse> {
        const claims: PublicNotifyClaims = await this.publicLink.verify(token);

        const resolver = this.resolvers[claims.t];
        if (!resolver) {
            throw new NotFoundException("This notification link is not supported.");
        }

        const entity = await resolver(this.db, claims.id);
        if (!entity) {
            throw new NotFoundException("This record no longer exists.");
        }

        return { type: claims.t, event: claims.ev ?? null, entity };
    }
}
