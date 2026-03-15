import { UserRole } from '../users/user.model';

export const SELF_REGISTER_ROLE_VALUES = [
  'farmer',
  'buyer',
  'expert',
  'trader',
] as const satisfies readonly UserRole[];

export type SelfRegisterRole = (typeof SELF_REGISTER_ROLE_VALUES)[number];

export interface SelfRegisterRoleOption {
  role: SelfRegisterRole;
  label: string;
  description: string;
  isDefault: boolean;
}

const SELF_REGISTER_ROLE_OPTIONS: ReadonlyArray<SelfRegisterRoleOption> = [
  {
    role: 'farmer',
    label: 'Farmer',
    description:
      'Individual farmer with personal workspace - can operate independently without organization',
    isDefault: true,
  },
  {
    role: 'buyer',
    label: 'Buyer',
    description: 'Marketplace buyer - can browse and purchase products',
    isDefault: false,
  },
  {
    role: 'expert',
    label: 'Expert',
    description: 'Agricultural expert/advisor - analytics and insights access',
    isDefault: false,
  },
  {
    role: 'trader',
    label: 'Trader',
    description: 'Agricultural trader - can create/manage products and orders',
    isDefault: false,
  },
];

export const getSelfRegisterRoleOptions = (): SelfRegisterRoleOption[] =>
  SELF_REGISTER_ROLE_OPTIONS.map((option) => ({ ...option }));
