export interface CategorieProdSummary {
  id: number;
  name: string;
  categorieShopId: number;
}

export interface CategorieShop {
  id: number;
  name: string;
  description: string | null;
  prodCategories?: CategorieProdSummary[];
}

export type CategorieShopWriteInput = {
  name?: string;
  description?: string | null;
} & Record<string, unknown>;
