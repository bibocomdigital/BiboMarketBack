export interface CategorieShopSummary {
  id: number;
  name: string;
  description: string | null;
}

export interface CategorieProd {
  id: number;
  name: string;
  categorieShopId: number;
  shopCategory?: CategorieShopSummary;
}

export type CategorieProdWriteInput = {
  name?: string;
  categorieShopId?: number;
} & Record<string, unknown>;
