import { Controller, Get } from "@nestjs/common";
import { Public } from "./auth/roles.decorator.js";

@Controller("health")
export class HealthController {
  @Public()
  @Get()
  status() {
    return {
      service: "zyteron-control-api",
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
