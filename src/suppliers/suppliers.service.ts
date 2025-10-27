import { Injectable } from '@nestjs/common';
import { id } from '@instantdb/admin';
import db from '../instant';
import { Supplier } from '../types';
import { CreateSupplierDto } from './dto/create-supplier.dto';

@Injectable()
export class SuppliersService {
  async create(createSupplierDto: CreateSupplierDto): Promise<Supplier> {
    const newSupplierId = id();
    const now = new Date().getTime();

    const newSupplierData = {
      ...createSupplierDto,
      createdAt: now,
    };

    await db.transact(
      db.tx.Suppliers[newSupplierId].create(newSupplierData),
    );

    const getSupplierResponse = await db.query({
      Suppliers: { $: { where: { id: newSupplierId } } },
    });

    return getSupplierResponse.Suppliers[0];
  }
}