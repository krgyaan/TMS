import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe } from "@nestjs/common";

import { EmployeeImprestService } from "./employee-imprest.service";
import type { CreateEmployeeImprestDto } from "./zod/create-employee-imprest.schema";
import type { UpdateEmployeeImprestDto } from "./zod/update-employee-imprest.schema";
import { CurrentUser } from "../../decorators/current-user.decorator";

@Controller("employee-imprest")
export class EmployeeImprestController {
    constructor(private readonly service: EmployeeImprestService) {}

    @Post()
    create(@Body() body: CreateEmployeeImprestDto, @CurrentUser("id") userId: number) {
        return this.service.create(body, userId);
    }

    @Get()
    getMyImprests(@CurrentUser("id") userId: number) {
        return this.service.findAllByUser(userId);
    }

    @Get("user/:userId")
    getByUser(@Param("userId", ParseIntPipe) userId: number) {
        return this.service.findAllByUser(userId);
    }

    @Get(":id")
    getOne(@Param("id", ParseIntPipe) id: number) {
        return this.service.findOne(id);
    }

    @Put(":id")
    update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateEmployeeImprestDto, @CurrentUser("id") userId: number) {
        return this.service.update(id, body, userId);
    }

    @Delete(":id")
    delete(@Param("id", ParseIntPipe) id: number, @CurrentUser("id") userId: number) {
        return this.service.delete(id, userId);
    }
}
