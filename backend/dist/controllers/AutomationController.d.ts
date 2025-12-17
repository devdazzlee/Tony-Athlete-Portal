import { Request, Response } from 'express';
export declare class AutomationController {
    getWorkflows(req: Request, res: Response): Promise<void>;
    getWorkflowById(req: Request, res: Response): Promise<void>;
    createWorkflow(req: Request, res: Response): Promise<void>;
    updateWorkflow(req: Request, res: Response): Promise<void>;
    deleteWorkflow(req: Request, res: Response): Promise<void>;
    triggerWorkflow(req: Request, res: Response): Promise<void>;
    testWorkflow(req: Request, res: Response): Promise<void>;
    getRules(req: Request, res: Response): Promise<void>;
    getRuleById(req: Request, res: Response): Promise<void>;
    createRule(req: Request, res: Response): Promise<void>;
    updateRule(req: Request, res: Response): Promise<void>;
    deleteRule(req: Request, res: Response): Promise<void>;
    activateRule(req: Request, res: Response): Promise<void>;
    deactivateRule(req: Request, res: Response): Promise<void>;
    testRule(req: Request, res: Response): Promise<void>;
    getAutomationAnalytics(req: Request, res: Response): Promise<void>;
    getWorkflowAnalytics(req: Request, res: Response): Promise<void>;
    getRuleAnalytics(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=AutomationController.d.ts.map