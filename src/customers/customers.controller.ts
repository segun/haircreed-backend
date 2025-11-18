import {
  Controller,
  Body,
  Post,
  Put,
  Param,
  Delete,
} from "@nestjs/common";
import { CustomersService } from "./customers.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { Customers } from "../types";

@Controller("api/v1/customers")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  createCustomer(
    @Body() createCustomerDto: CreateCustomerDto,
  ): Promise<Customers> {
    return this.customersService.create(createCustomerDto);
  }

  @Put(":id")
  updateCustomer(
    @Param("id") customerId: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ): Promise<Customers> {
    return this.customersService.update(customerId, updateCustomerDto);
  }

  @Delete(":id")
  deleteCustomer(@Param("id") customerId: string): Promise<void> {
    return this.customersService.delete(customerId);
  }
}
