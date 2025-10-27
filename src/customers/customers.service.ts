import { Injectable, NotFoundException } from "@nestjs/common";
import { id } from "@instantdb/admin";
import db from "../instant";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { Customers } from "../types";

@Injectable()
export class CustomersService {
  async findOne(id: string): Promise<Customers> {
    const findOneResponse = await db.query({
      Customers: { $: { where: { id } }, orders: {}, addresses: {} },
    });

    if (findOneResponse.Customers.length === 0) {
      throw new NotFoundException(`Customer with ID "${id}" not found`);
    }
    return findOneResponse.Customers[0];
  }

  async create(createCustomerDto: CreateCustomerDto): Promise<Customers> {
    const { newAddress, ...customerData } = createCustomerDto;
    const newId = id();
    await db.transact(
      db.tx.Customers[newId].create({
        createdAt: Date.now(),
        email: customerData.email,
        fullName: customerData.fullName,
        headSize: customerData.headSize,
        phoneNumber: customerData.phoneNumber,
      }),
    );

    if (newAddress) {
      const addressId = id();
      await db.transact(
        db.tx.CustomerAddress[addressId].create({
          address: newAddress.address,
          isPrimary: newAddress.isPrimary,
          createdAt: Date.now(),
        }),
      );
      await db.transact(db.tx.Customers[newId].link({ addresses: addressId }));
    }
    return this.findOne(newId);
  }

  async update(
    customerId: string,
    updateCustomerDto: UpdateCustomerDto,
  ): Promise<Customers> {
    const { newAddress, ...customerData } = updateCustomerDto;
    const txs = [];

    if (Object.keys(customerData).length > 0) {
      txs.push(db.tx.Customers[customerId].update(customerData));
    }

    if (newAddress) {
      if (newAddress.isPrimary) {
        // Unset existing primary address
        const existingAddressesResponse = await db.query({
          CustomerAddress: {
            $: {
              where: {
                customer: customerId,
                isPrimary: true,
              },
            },
          },
        });
        const primaryAddresses = existingAddressesResponse.CustomerAddress.find(
          (addr) => addr.isPrimary,
        );
        if (primaryAddresses) {
          txs.push(
            db.tx.CustomerAddress[primaryAddresses.id].update({
              isPrimary: false,
            }),
          );
        }
      }

      const addressId = id();
      txs.push(
        db.tx.CustomerAddress[addressId].create({
          ...newAddress,
          createdAt: Date.now(),
        }),
      );
      txs.push(db.tx.Customers[customerId].link({ addresses: addressId }));
    }

    if (txs.length > 0) {
      await db.transact(txs);
    }

    return this.findOne(customerId);
  }
}
