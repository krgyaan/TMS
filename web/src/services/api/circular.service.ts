import { BaseApiService } from "./base.service";
import type { Circular } from "@/types/api.types";

class CircularService extends BaseApiService {
    constructor(){
        super('/circular')
    }

    async getAll() : Promise<Circular[]>{
        return this.get<Circular[]>();
    }

    async create(data: Partial<Circular> | FormData) : Promise<Circular>{
        return this.post<Circular>("", data);
    }   

    async update(id : number, data : Partial<Circular> | FormData) : Promise<Circular>{
        return this.patch<Circular>(`/${id}`, data);
    }

    async deleteCircular(id : number) : Promise<void>{
        return this.delete<void>(`/${id}`);
    }
}

export const circularService = new CircularService();