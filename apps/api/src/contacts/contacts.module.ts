import { Module } from "@nestjs/common";
import { ClientsModule } from "../clients/clients.module.js";
import { ContactsController } from "./contacts.controller.js";
import { ContactsRepository } from "./contacts.repository.js";
import { ContactsService } from "./contacts.service.js";
@Module({imports:[ClientsModule],controllers:[ContactsController],providers:[ContactsRepository,ContactsService],exports:[ContactsService]})
export class ContactsModule {}
