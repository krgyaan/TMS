// src/pages/project-dashboard/project-dashboard.hooks.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  fetchDashboardDetailsById, 
  fetchPoParties,
  createPurchaseOrder,
  createPoParty,
  fetchPurchaseOrderById,
  updatePurchaseOrder,
  type CreatePurchaseOrderDTO,
  type CreatePartyDTO,
  type UpdatePurchaseOrderDTO
} from "./project-dashboard.api";

export const projectsDashboardKeys = {
  all: ["projects-dashboard"] as const,
  lists: () => [...projectsDashboardKeys.all, "list"] as const,
  poParties: () => [...projectsDashboardKeys.all, "po-parties"] as const,
  detail: (id: number) => [...projectsDashboardKeys.all, "detail", id] as const,
  purchaseOrder: (id: number) => [...projectsDashboardKeys.all, "purchase-order", id] as const,
};

// Get project dashboard details by ID
export const useProjectDashboardDetails = (id: number) => {
  return useQuery({
    queryKey: projectsDashboardKeys.detail(id),
    queryFn: () => fetchDashboardDetailsById(id),
    enabled: !!id,
  });
};

// Get all parties
export const usePoParties = () => {
  return useQuery({
    queryKey: projectsDashboardKeys.poParties(),
    queryFn: () => fetchPoParties(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const usePurchaseOrderDetails = (id: number) => {
  return useQuery({
    queryKey: [],
    queryFn: () => fetchPurchaseOrderById(id),
    enabled: !!id,
  })
}

// Create Purchase Order mutation
export const useCreatePurchaseOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreatePurchaseOrderDTO) => createPurchaseOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsDashboardKeys.all });
    },
  });
};

export const useUpdatePurchaseOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({id, data} : {id: number, data : UpdatePurchaseOrderDTO}) => updatePurchaseOrder(id, data),
    onSuccess: () =>{
      queryClient.invalidateQueries({ queryKey: projectsDashboardKeys.all });
    }
  })
}

// Create Party mutation
export const useCreatePoParty = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreatePartyDTO) => createPoParty(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsDashboardKeys.poParties() });
    },
  });
};