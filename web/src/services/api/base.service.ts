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
        const isFormData = data instanceof FormData;
        const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined;
        
        const response: AxiosResponse<T> = await axiosInstance.post(
            `${this.basePath}${endpoint}`,
            data,
            config
        )
        return response.data
    }

    protected async patch<T, D = any>(endpoint: string, data: D): Promise<T> {
        const isFormData = data instanceof FormData;
        const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined;

        const response: AxiosResponse<T> = await axiosInstance.patch(
            `${this.basePath}${endpoint}`,
            data,
            config
        )
        return response.data
    }

    protected async put<T, D = any>(endpoint: string = '', data?: D): Promise<T> {
        const isFormData = data instanceof FormData;
        const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined;

        const response: AxiosResponse<T> = await axiosInstance.put(
            `${this.basePath}${endpoint}`,
            data,
            config
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
