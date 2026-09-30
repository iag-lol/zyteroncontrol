import { Injectable } from "@nestjs/common";
import { ClientsRepository } from "./clients.repository.js";

@Injectable()
export class ClientEventsService {
  constructor(private readonly repository: ClientsRepository) {}
  list(clientId: string) { return this.repository.eventsFor(clientId); }
  publish(clientId: string, type: string, title: string, description: string | null = null) {
    return this.repository.addEvent({ clientId, type, title, description, actorId: null, visibility: "INTERNAL_ONLY", metadata: {} });
  }
}

