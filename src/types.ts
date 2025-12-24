export type Department =
  | "フロント"
  | "営業"
  | "経理"
  | "ドライバー"
  | "工場"
  | "AK"
  | "マスター管理";

export type FeatureKey =
  | "inventory"
  | "machine"
  | "orders"
  | "dispatch"
  | "sites"
  | "data"
  | "ar"
  | "invoices"
  | "adjustment"
  | "repair"
  | "masters";

export interface FeatureCard {
  key: FeatureKey;
  name: string;
  description: string;
  subFeatures: string[];
}

export interface User {
  userId: string;
  userName: string;
  password: string;
  departments: Department[];
  permissions: Partial<Record<Department, FeatureKey[]>>;
}

