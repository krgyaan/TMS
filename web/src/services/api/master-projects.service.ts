// src/api/projectsMaster.api.ts
import api from "@/lib/axios";

export interface ProjectMaster {
    id: number;
    projectName: string;
    // add other fields from your DB schema
}

const BASE_URL = "/projects-master";

export const fetchAllProjectsMaster = async (): Promise<ProjectMaster[]> => {
    const { data } = await api.get<ProjectMaster[]>(BASE_URL);
    return data;
};

export const fetchProjectMasterById = async (id: number): Promise<ProjectMaster> => {
    const { data } = await api.get<ProjectMaster>(`${BASE_URL}/${id}`);
    return data;
};
