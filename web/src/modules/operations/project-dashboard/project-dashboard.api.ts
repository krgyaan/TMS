// src/pages/project-dashboard/project-dashboard.api.ts

import api from "@/lib/axios";
import type { ProjectDashboardResponse } from "./project-dashboard.type";

const BASE_URL = "/projects";

export const fetchDashboardDetailsById = async (id: number): Promise<any> => {
  const res = await api.get<ProjectDashboardResponse>(`${BASE_URL}/details/${id}`);
  return res.data;
};

export const fetchPoParties = async (): Promise<any> => {
  const res = await api.get<any>(`${BASE_URL}/purchase-orders/parties`);
  return res.data;
};

// Create Purchase Order
export const createPurchaseOrder = async (data: CreatePurchaseOrderDTO): Promise<any> => {
  const res = await api.post(`${BASE_URL}/purchase-orders`, data);
  return res.data;
};

// Create Party
export const createPoParty = async (data: CreatePartyDTO): Promise<any> => {
  const res = await api.post(`${BASE_URL}/purchase-orders/parties`, data);
  return res.data;
};

// Get Purchase Order by ID
export const fetchPurchaseOrderById = async (id: number): Promise<any> => {
  const res = await api.get(`${BASE_URL}/purchase-orders/${id}`);
  console.log("data received: ", res);
  return res.data;
};


// Types
export interface CreatePurchaseOrderDTO {
  tenderId: number;
  poDate: string;
  
  // Seller Info
  sellerId?: number;
  sellerName: string;
  sellerEmail: string;
  sellerAddress: string;
  sellerGstNo: string;
  sellerPanNo: string;
  sellerMsmeNo: string;
  
  // Ship To Info
  shipToName: string;
  shippingAddress: string;
  shipToGst: string;
  shipToPan: string;
  
  // Products
  products: CreateProductDTO[];
  
  // Optional fields
  quotationNo?: string;
  quotationDate?: string;
  paymentTerms?: string;
  deliveryPeriod?: string;
  remarks?: string;
}

export interface CreateProductDTO {
  description: string;
  hsnSac: string;
  qty: number;
  rate: number;
  gstRate: number;
}

export interface CreatePartyDTO {
  name: string;
  email?: string;
  address?: string;
  gstNo?: string;
  pan?: string;
  msme?: string;
}

export interface UpdatePurchaseOrderDTO {
  poDate: string;
  
  // Seller Info
  sellerId?: number;
  sellerName: string;
  sellerEmail: string;
  sellerAddress: string;
  sellerGstNo: string;
  sellerPanNo: string;
  sellerMsmeNo: string;
  
  // Ship To Info
  shipToName: string;
  shippingAddress: string;
  shipToGst: string;
  shipToPan: string;
  
  // Products
  products: CreateProductDTO[];
  
  // Optional fields
  quotationNo?: string;
  quotationDate?: string;
  paymentTerms?: string;
  deliveryPeriod?: string;
  remarks?: string;
}


export const updatePurchaseOrder = async (
  id: number,
  data: UpdatePurchaseOrderDTO
): Promise<any> => {
  const res = await api.put(`${BASE_URL}/purchase-orders/${id}`, data);
  return res.data;
};
