import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Post,
    Put,
    Query,
    Req,
} from "@nestjs/common";
import { ZodValidationPipe } from "nestjs-zod";
import { CustomerService } from "./customer.service";
import {
    AllotEngineerSchema,
    CreateCustomerComplaintSchema,
    UpdateCustomerComplaintSchema,
} from "./dto/customer.dto";

@Controller("customer")
export class CustomerController {
    constructor(private readonly service: CustomerService) {}

    @Get()
    list(@Query("search") search?: string) {
        return this.service.list(search);
    }

    @Get(":id")
    getById(@Param("id", ParseIntPipe) id: number) {
        return this.service.getById(id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body(new ZodValidationPipe(CreateCustomerComplaintSchema)) body: any, @Req() req: any) {
        return this.service.create(body, req.user?.id ?? req.user?.sub);
    }

    @Put(":id")
    @HttpCode(HttpStatus.OK)
    update(
        @Param("id", ParseIntPipe) id: number,
        @Body(new ZodValidationPipe(UpdateCustomerComplaintSchema)) body: any,
    ) {
        return this.service.update(id, body);
    }

    @Post(":id/engineers")
    @HttpCode(HttpStatus.CREATED)
    allotEngineer(
        @Param("id", ParseIntPipe) id: number,
        @Body(new ZodValidationPipe(AllotEngineerSchema)) body: any,
        @Req() req: any,
    ) {
        return this.service.allotEngineer(id, body, req.user?.id ?? req.user?.sub);
    }

    @Put(":id/engineers/:engineerId")
    @HttpCode(HttpStatus.OK)
    updateEngineer(
        @Param("id", ParseIntPipe) id: number,
        @Param("engineerId", ParseIntPipe) engineerId: number,
        @Body(new ZodValidationPipe(AllotEngineerSchema)) body: any,
    ) {
        return this.service.updateEngineer(id, engineerId, body);
    }

    @Delete(":id")
    @HttpCode(HttpStatus.OK)
    remove(@Param("id", ParseIntPipe) id: number) {
        return this.service.remove(id);
    }
}
