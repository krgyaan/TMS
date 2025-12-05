import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe } from "@nestjs/common";

import { EmployeeImprestService } from '@/modules/employee-imprest/employee-imprest.service';

import type { CreateEmployeeImprestDto } from '@/modules/employee-imprest/zod/create-employee-imprest.schema';

import type { UpdateEmployeeImprestDto } from '@/modules/employee-imprest/zod/update-employee-imprest.schema';

@Controller("employee-imprest")
export class EmployeeImprestController {
    constructor(private readonly service: EmployeeImprestService) { }

    @Post()
    create(@Body() body: CreateEmployeeImprestDto) {
        console.log(body);
        return this.service.create(body);
    }

    @Get("user/:id")
    getByUser(@Param("id", ParseIntPipe) id: number) {
        return this.service.findAllByUser(id);
    }

    @Get(":id")
    getOne(@Param("id", ParseIntPipe) id: number) {
        return this.service.findOne(id);
    }

    @Put(":id")
    update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateEmployeeImprestDto) {
        return this.service.update(id, body);
    }

    @Delete(":id")
    delete(@Param("id", ParseIntPipe) id: number) {
        return this.service.delete(id);
    }
}
