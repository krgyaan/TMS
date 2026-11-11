import { BaseApiService } from "./base.service";
import type { Location } from "@/types/api.types";

class LocationsService extends BaseApiService {
    constructor() {
        super("/locations");
    }

    async getAll(): Promise<Location[]> {
        return await this.get<Location[]>();
    }

    async getAllTrue(): Promise<Location[]> {
        return await this.get<Location[]>("/list-true");
    }

    async getStates(): Promise<string[]> {
        return await this.get<string[]>("/states");
    }

    async getRegions(state?: string): Promise<string[]> {
        return await this.get<string[]>("/regions", { params: { state } });
    }

    async getById(id: number): Promise<Location> {
        return this.get<Location>(`/${id}`);
    }

    async create(data: Partial<Location>): Promise<Location> {
        return this.post<Location>("", data);
    }

    async update(id: number, data: Partial<Location>): Promise<Location> {
        return this.patch<Location>(`/${id}`, data);
    }

    async deleteLocation(id: number): Promise<void> {
        return this.delete<void>(`/${id}`);
    }
}

export const locationsService = new LocationsService();
