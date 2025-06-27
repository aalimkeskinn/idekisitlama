export interface TimeConstraint {
  id: string;
  entityType: 'teacher' | 'class' | 'subject';
  entityId: string;
  day: string;
  period: string;
  constraintType: 'unavailable' | 'preferred' | 'restricted';
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const CONSTRAINT_TYPES = {
  unavailable: {
    label: 'Müsait Değil',
    description: 'Bu zaman diliminde kesinlikle ders verilemez',
    color: 'bg-red-100 border-red-300 text-red-800',
    icon: '🚫'
  },
  preferred: {
    label: 'Tercih Edilen',
    description: 'Bu zaman dilimi tercih edilir',
    color: 'bg-green-100 border-green-300 text-green-800',
    icon: '✅'
  },
  restricted: {
    label: 'Kısıtlı',
    description: 'Bu zaman diliminde sınırlı ders verilebilir',
    color: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    icon: '⚠️'
  }
} as const;

export type ConstraintType = keyof typeof CONSTRAINT_TYPES;