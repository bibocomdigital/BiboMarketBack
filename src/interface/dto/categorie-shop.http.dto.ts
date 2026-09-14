export type CreateCategorieShopHttpDto = {
  name: string;
  description?: string | null;
} & Record<string, unknown>;

export type UpdateCategorieShopHttpDto = {
  name?: string;
  description?: string | null;
} & Record<string, unknown>;
