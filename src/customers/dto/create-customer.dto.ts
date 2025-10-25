import { IsObject } from "class-validator";
import { CustomerAddress, Customers } from "src/types";

export type CreateCustomerDto = Partial<Customers> & {
  newAddress: Partial<CustomerAddress>;
};
