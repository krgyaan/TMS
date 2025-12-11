import api from "@/lib/axios";
import type { CreateFollowUpDto, UpdateFollowUpDto, UpdateFollowUpStatusDto, FollowUpQueryDto, FollowUpDetailsDto } from "./follow-up.types";

// ✅ LIST
export const getFollowUps = async (query: FollowUpQueryDto) => {
    const { data } = await api.get("/follow-up", { params: query });
    console.log(data);
    return data;
};

export const getFollowUpDetail = async (id: number): Promise<FollowUpDetailsDto> => {
    const { data } = await api.get(`/follow-up/${id}`);
    console.log(data);
    return data;
};

// ✅ CREATE
export const createFollowUp = async (payload: CreateFollowUpDto) => {
    console.log(payload);
    const { data } = await api.post("/follow-up", payload);
    return data;
};

// ✅ UPDATE
export const updateFollowUp = async ({ id, data }: { id: number; data: UpdateFollowUpDto }) => {
    console.log("API called from frontend");
    console.log(id);
    console.log(data);
    const res = await api.put(`/follow-up/${id}`, data);
    return res.data;
};

// ✅ UPDATE STATUS
export const updateFollowUpStatus = async ({ id, data }: { id: number; data: UpdateFollowUpStatusDto }) => {
    console.log("Making the API call");
    const res = await api.put(`/follow-up/${id}/status`, data);
    console.log("THIS IS MY API RESPONSE");
    console.log(res);
    return res.data;
};
// ✅ get
export const getAreas = async () => {
    const res = await api.get("/follow-up/areas");
    return res.data;
};

// ✅ DELETE
export const deleteFollowUp = async (id: number) => {
    await api.delete(`/follow-up/${id}`);
};
