import { BadRequestException, Injectable } from "@nestjs/common";
import {
  pipelineStages,
  type CommercialRecord,
  type CreateCommercialRecord,
  type PipelineSummary,
} from "@zyteron/contracts";

@Injectable()
export class CrmService {
  private readonly records: CommercialRecord[] = [];

  getPipeline(): PipelineSummary {
    return {
      records: this.records,
      activeCount: this.records.length,
      totalValueClp: this.records.reduce((sum, item) => sum + item.valueClp, 0),
      generatedAt: new Date().toISOString(),
    };
  }

  create(input: CreateCommercialRecord): CommercialRecord {
    if (!input.company || !input.contact || !input.title || !input.owner) {
      throw new BadRequestException("Faltan campos obligatorios.");
    }

    const stage = input.stage ?? "LEAD";
    if (!pipelineStages.includes(stage)) {
      throw new BadRequestException("Etapa de pipeline inválida.");
    }

    const record: CommercialRecord = {
      ...input,
      id: crypto.randomUUID(),
      stage,
      valueClp: Number(input.valueClp) || 0,
      updatedAt: new Date().toISOString(),
    };
    this.records.unshift(record);
    return record;
  }
}
