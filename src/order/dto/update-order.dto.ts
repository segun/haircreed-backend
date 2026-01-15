
import { Orders } from "../../types";

export class UpdateOrderDto {
  updates: Partial<Orders> & { customerId?: string; wigger?: string };  userId: string;
  customerChanged?: boolean;
}