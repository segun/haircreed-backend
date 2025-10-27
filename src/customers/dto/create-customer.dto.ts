import { IsObject } from "class-validator";
import { CustomerAddress, Customers } from "../../types";

export type CreateCustomerDto = Partial<Customers> & {
  newAddress: Partial<CustomerAddress>;
};
