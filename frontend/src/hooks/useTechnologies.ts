import { useQuery } from "@tanstack/react-query";
import { fetchTechnologies } from "@/api/technologies";

export function useTechnologies() {
  return useQuery({
    queryKey: ["technologies"],
    queryFn: fetchTechnologies,
    staleTime: 5 * 60 * 1000,
  });
}
