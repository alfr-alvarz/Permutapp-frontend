import FontAwesome from '@expo/vector-icons/FontAwesome';

import { ProductoCategoria } from '@/services/api';

export type ProductCategoryId = string;

export interface ProductCategory {
  id: ProductCategoryId;
  label: string;
  query: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  backgroundColor: string;
  borderColor: string;
  iconColor: string;
  keywords: string[];
}

export function normalizeCategoryText(value?: string | null): string {
  if (!value) return '';
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function toProductCategory(dto: ProductoCategoria): ProductCategory {
  return {
    id: dto.cat_id,
    label: dto.cat_nombre,
    query: dto.cat_query,
    icon: (dto.cat_icon || 'tag') as ProductCategory['icon'],
    backgroundColor: dto.cat_bg_color || '#f5f5f5',
    borderColor: dto.cat_border_color || '#e5e5e5',
    iconColor: dto.cat_icon_color || '#047857',
    keywords: dto.cat_keywords ?? [],
  };
}

export function findCategoryByValue(categories: ProductCategory[], value?: string | null): ProductCategory | null {
  const normalized = normalizeCategoryText(value);
  if (!normalized) return null;
  return categories.find((category) => (
    normalizeCategoryText(category.id) === normalized
    || normalizeCategoryText(category.query) === normalized
    || normalizeCategoryText(category.label) === normalized
  )) ?? null;
}
