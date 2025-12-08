export const Audit = {
  ORIGIN: {
    UPDATE_ORDER: 'UPDATE_ORDER',
    DELETE_ORDER: 'DELETE_ORDER',
    // other origins can be added here
  },
  ACTION: {
    CREATE_INVENTORY: 'CREATE_INVENTORY',
    UPDATE_INVENTORY: 'UPDATE_INVENTORY',
    DELETE_INVENTORY: 'DELETE_INVENTORY',
  },
};

export type AuditOrigin = keyof typeof Audit.ORIGIN;
export type AuditAction = keyof typeof Audit.ACTION;
