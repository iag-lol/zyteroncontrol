import { Module } from "@nestjs/common";
import { DocumentsModule } from "../documents/documents.module.js";
import { SupportModule } from "../support/support.module.js";
import { EmploymentAnnexesService,EmploymentContractsService } from "./contracts.service.js";
import { EmployeeAccessService,EmployeesService,OrganizationService } from "./employees.service.js";
import { EmploymentAnnexesController,EmploymentContractsController,EmployeesController,HrController,LeaveController,LreController,MedicalLeaveController,OffboardingController,OnboardingController,OrganizationController,PayrollController,WorkforceController } from "./hr.controller.js";
import { AttendanceProvider,DeferredAttendanceProvider,DeferredPayrollSubmissionProvider,ExternalLaborAuthorityProvider,HrDocumentRenderer,LaborAuthorityProvider,LeavePolicyEngine,PayrollRuleEngine,PayrollSubmissionProvider } from "./hr.providers.js";
import { HrReadService } from "./hr-read.service.js";
import { HrRepository } from "./hr.repository.js";
import { LreService,PayrollService } from "./payroll.service.js";
import { LeaveService,MedicalLeaveService,OffboardingService,OnboardingService,WorkforceOperationsService } from "./workforce.service.js";

@Module({imports:[DocumentsModule,SupportModule],controllers:[HrController,EmployeesController,OrganizationController,EmploymentContractsController,EmploymentAnnexesController,OnboardingController,OffboardingController,LeaveController,MedicalLeaveController,PayrollController,LreController,WorkforceController],providers:[HrRepository,EmployeeAccessService,EmployeesService,OrganizationService,EmploymentContractsService,EmploymentAnnexesService,OnboardingService,OffboardingService,LeaveService,MedicalLeaveService,WorkforceOperationsService,PayrollService,LreService,HrReadService,LeavePolicyEngine,PayrollRuleEngine,HrDocumentRenderer,ExternalLaborAuthorityProvider,{provide:LaborAuthorityProvider,useExisting:ExternalLaborAuthorityProvider},DeferredAttendanceProvider,{provide:AttendanceProvider,useExisting:DeferredAttendanceProvider},DeferredPayrollSubmissionProvider,{provide:PayrollSubmissionProvider,useExisting:DeferredPayrollSubmissionProvider}],exports:[EmployeesService,HrReadService]})export class HrModule{}
