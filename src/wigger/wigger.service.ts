import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { id } from "@instantdb/admin";
import db from "../instant";
import { CreateWiggerDto } from "./dto/create-wigger.dto";
import { Wigger } from "../types";

@Injectable()
export class WiggerService {
  async findAll(): Promise<Wigger[]> {
    const response = await db.query({
      Wigger: { $: {}, orders: {} },
    });
    return response.Wigger;
  }

  async findOne(id: string): Promise<Wigger> {
    const response = await db.query({
      Wigger: { $: { where: { id } }, orders: {} },
    });

    if (response.Wigger.length === 0) {
      throw new NotFoundException(`Wigger with ID "${id}" not found`);
    }
    return response.Wigger[0];
  }

  async findByName(name: string): Promise<Wigger | null> {
    const response = await db.query({
      Wigger: { $: { where: { name } }, orders: {} },
    });

    if (response.Wigger.length === 0) {
      return null;
    }
    return response.Wigger[0];
  }

  async create(createWiggerDto: CreateWiggerDto): Promise<Wigger> {
    // Check if wigger already exists
    const existingWigger = await this.findByName(createWiggerDto.name);
    if (existingWigger) {
      throw new ConflictException(`Wigger with name "${createWiggerDto.name}" already exists`);
    }

    const newId = id();
    await db.transact([
      db.tx.Wigger[newId].create({
        name: createWiggerDto.name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    ]);

    return this.findOne(newId);
  }

  async update(id: string, updateWiggerDto: Partial<CreateWiggerDto>): Promise<Wigger> {
    const wigger = await this.findOne(id);

    // If name is being updated, check for duplicates
    if (updateWiggerDto.name && updateWiggerDto.name !== wigger.name) {
      const existingWigger = await this.findByName(updateWiggerDto.name);
      if (existingWigger) {
        throw new ConflictException(`Wigger with name "${updateWiggerDto.name}" already exists`);
      }
    }

    await db.transact([
      db.tx.Wigger[id].update({
        ...updateWiggerDto,
        updatedAt: Date.now(),
      }),
    ]);

    return this.findOne(id);
  }

  async delete(id: string): Promise<{ deletedWiggerId: string }> {
    const wigger = await this.findOne(id);

    await db.transact([db.tx.Wigger[id].delete()]);

    return { deletedWiggerId: wigger.id };
  }
}
