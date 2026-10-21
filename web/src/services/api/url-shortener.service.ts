import { BaseApiService } from "./base.service";

class UrlShortenerService extends BaseApiService {
    constructor() {
        super("/url-shortener");
    }

    resolve(token: string): Promise<{ url: string }> {
        return this.get<{ url: string }>(`/${token}`, { skipAuthRedirect: true });
    }
}

export const urlShortenerService = new UrlShortenerService();
