import axiosInstance from '@/lib/axios'
import type { AxiosResponse } from 'axios'

export class BaseApiService {
    protected basePath: string

    constructor(basePath: string) {
        this.basePath = basePath
    }

    protected async get<T>(endpoint: string = ''): Promise<T> {
        const response: AxiosResponse<T> = await axiosInstance.get(
            `${this.basePath}${endpoint}`
        )
        return response.data
    }

    protected async post<T, D = any>(endpoint: string = '', data?: D): Promise<T> {
        const url = `${this.basePath}${endpoint}`;
        console.log('[BaseApiService] POST request:', { url, basePath: this.basePath, endpoint, data });

        try {
            const response: AxiosResponse<T> = await axiosInstance.post(url, data);
            console.log('[BaseApiService] POST response received:', {
                url,
                status: response.status,
                statusText: response.statusText,
                data: response.data,
            });
            return response.data;
        } catch (error: any) {
            console.error('[BaseApiService] POST request failed:', {
                url,
                error: error?.message,
                response: error?.response?.data,
                status: error?.response?.status,
                statusText: error?.response?.statusText,
                config: {
                    method: error?.config?.method,
                    url: error?.config?.url,
                    data: error?.config?.data,
                },
            });
            throw error;
        }
    }

    protected async patch<T, D = any>(endpoint: string, data: D): Promise<T> {
        const response: AxiosResponse<T> = await axiosInstance.patch(
            `${this.basePath}${endpoint}`,
            data
        )
        return response.data
    }

    protected async put<T, D = any>(endpoint: string = '', data?: D): Promise<T> {
        const response: AxiosResponse<T> = await axiosInstance.put(
            `${this.basePath}${endpoint}`,
            data
        )
        return response.data
    }

    protected async delete<T>(endpoint: string): Promise<T> {
        const response: AxiosResponse<T> = await axiosInstance.delete(
            `${this.basePath}${endpoint}`
        )
        return response.data
    }
}
