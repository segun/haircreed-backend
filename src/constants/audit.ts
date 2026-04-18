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
    CREATE_PRODUCT: 'CREATE_PRODUCT',
    ADD_PRODUCT_STOCK: 'ADD_PRODUCT_STOCK',
    USE_PRODUCT: 'USE_PRODUCT',
    UPDATE_PRODUCT: 'UPDATE_PRODUCT',
    DELETE_PRODUCT: 'DELETE_PRODUCT',
  },
};

export type AuditOrigin = keyof typeof Audit.ORIGIN;
export type AuditAction = keyof typeof Audit.ACTION;
