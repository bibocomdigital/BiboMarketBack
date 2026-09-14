export type CreateCategorieProdHttpDto = {
  name: string;
  categorieShopId: number;
} & Record<string, unknown>;

export type UpdateCategorieProdHttpDto = {
  name?: string;
  categorieShopId?: number;
} & Record<string, unknown>;
