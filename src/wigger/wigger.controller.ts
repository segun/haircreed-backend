import { Controller, Get, Post, Body, Param, Put, Delete } from "@nestjs/common";
import { WiggerService } from "./wigger.service";
import { CreateWiggerDto } from "./dto/create-wigger.dto";
import { Wigger } from "../types";

@Controller("wiggers")
export class WiggerController {
  constructor(private wiggerService: WiggerService) {}

  @Get()
  async findAll(): Promise<Wigger[]> {
    return this.wiggerService.findAll();
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<Wigger> {
    return this.wiggerService.findOne(id);
  }

  @Get("name/:name")
  async findByName(@Param("name") name: string): Promise<Wigger | null> {
    return this.wiggerService.findByName(name);
  }

  @Post()
  async create(@Body() createWiggerDto: CreateWiggerDto): Promise<Wigger> {
    return this.wiggerService.create(createWiggerDto);
  }

  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() updateWiggerDto: Partial<CreateWiggerDto>,
  ): Promise<Wigger> {
    return this.wiggerService.update(id, updateWiggerDto);
  }

  @Delete(":id")
  async delete(@Param("id") id: string): Promise<{ deletedWiggerId: string }> {
    return this.wiggerService.delete(id);
  }
}
