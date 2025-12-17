export interface RegistrationField {
    id: string;
    name: string;
    label: string;
    type: "TEXT" | "EMAIL" | "PASSWORD" | "PHONE" | "SELECT" | "CHECKBOX" | "RADIO" | "TEXTAREA" | "FILE" | "DATE";
    required: boolean;
    placeholder?: string;
    options?: string[];
    validation?: FieldValidation;
    order: number;
}
export interface FieldValidation {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    customMessage?: string;
}
export interface RegistrationSettings {
    allowRegistration: boolean;
    requireApproval: boolean;
    requireEmailVerification: boolean;
    autoAssignTier: boolean;
    defaultTierId?: string;
    welcomeEmail: boolean;
    welcomeEmailTemplate?: string;
    redirectUrl?: string;
    customCss?: string;
    customJs?: string;
}
export interface RegistrationSubmission {
    id: string;
    formId: string;
    data: Record<string, any>;
    status: "PENDING" | "APPROVED" | "REJECTED" | "UNDER_REVIEW";
    submittedAt: Date;
    reviewedAt?: Date;
    reviewedBy?: string;
    notes?: string;
    ipAddress: string;
    userAgent: string;
}
export interface RegistrationWorkflow {
    id: string;
    accountId: string;
    name: string;
    description: string;
    steps: WorkflowStep[];
    status: "ACTIVE" | "INACTIVE";
    createdAt: Date;
    updatedAt: Date;
}
export interface WorkflowStep {
    id: string;
    name: string;
    type: "FORM" | "APPROVAL" | "EMAIL" | "WEBHOOK" | "CONDITION";
    order: number;
    settings: any;
    conditions?: WorkflowCondition[];
}
export interface WorkflowCondition {
    field: string;
    operator: "EQUALS" | "NOT_EQUALS" | "CONTAINS" | "GREATER_THAN" | "LESS_THAN";
    value: any;
}
export declare class RegistrationModel {
    static createForm(data: any): Promise<any>;
    static findFormById(id: string): Promise<any | null>;
    static findActiveForm(accountId: string): Promise<any | null>;
    static updateForm(id: string, data: any): Promise<any>;
    static deleteForm(id: string): Promise<void>;
    static listForms(accountId: string, filters?: any): Promise<any[]>;
    static submitRegistration(formId: string, data: Record<string, any>, ipAddress: string, userAgent: string): Promise<RegistrationSubmission>;
    private static validateSubmission;
    private static processSubmission;
    static approveSubmission(submissionId: string, reviewedBy: string, notes?: string): Promise<RegistrationSubmission>;
    static rejectSubmission(submissionId: string, reviewedBy: string, notes: string): Promise<RegistrationSubmission>;
    private static createUserFromSubmission;
    static getSubmissions(formId: string, filters?: any, page?: number, limit?: number): Promise<RegistrationSubmission[]>;
    static createWorkflow(data: any): Promise<any>;
    static findWorkflowById(id: string): Promise<any | null>;
    static updateWorkflow(id: string, data: any): Promise<any>;
    static deleteWorkflow(id: string): Promise<void>;
    static listWorkflows(accountId: string): Promise<any[]>;
    static executeWorkflow(workflowId: string, submissionData: Record<string, any>): Promise<void>;
    private static executeWorkflowStep;
    static getRegistrationStats(accountId: string, startDate?: Date, endDate?: Date): Promise<any>;
    static createDefaultForm(accountId: string): Promise<any>;
    static exportFormData(formId: string): Promise<any>;
    static importFormData(accountId: string, formData: any): Promise<any>;
}
//# sourceMappingURL=Registration.d.ts.map