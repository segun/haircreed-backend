import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  Query as QueryDecorator,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { InventoryReadService } from './inventory-read.service';
import { Query } from '../database-reads/read-query';
import { ReadAuthGuard, ReadRoles } from '../database-reads/read-auth.guard';
import { ReadErrorFilter } from '../database-reads/read-error.filter';

@Controller('api/v1/inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly inventoryReadService: InventoryReadService,
  ) {}

  @Get()
  @UseGuards(ReadAuthGuard)
  @UseFilters(ReadErrorFilter)
  @ReadRoles('POS_OPERATOR', 'ADMIN', 'SUPER_ADMIN')
  findAll(@QueryDecorator() query: Query) {
    return this.inventoryReadService.inventoryList(query);
  }

  @Get(':inventoryItemId/audits')
  @UseGuards(ReadAuthGuard)
  @UseFilters(ReadErrorFilter)
  @ReadRoles('ADMIN', 'SUPER_ADMIN')
  findAudits(
    @Param('inventoryItemId') inventoryItemId: string,
    @QueryDecorator() query: Query,
  ) {
    return this.inventoryReadService.inventoryAudits(inventoryItemId, query);
  }

  @Post()
  create(@Body() createInventoryItemDto: CreateInventoryItemDto) {
    return this.inventoryService.create(createInventoryItemDto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateInventoryItemDto: UpdateInventoryItemDto,
  ) {
    return this.inventoryService.update(id, updateInventoryItemDto);
  }

  @Delete(':id/:userId/:origin?')
  @HttpCode(204)
  remove(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Param('origin') origin?: string,
  ) {
    return this.inventoryService.remove(id, userId, origin);
  }
}