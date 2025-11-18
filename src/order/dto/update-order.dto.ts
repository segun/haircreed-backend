
import { Orders } from "../../types";

export class UpdateOrderDto {
  updates: Partial<Orders> & { customerId?: string };
  userId: string;
  customerChanged?: boolean;
}
