import { Request, Response } from "express";

class ModerationController {
    async listTranslations(request: Request, response: Response) {
        return response.json({ route: "listTranslations" });
    }
    
    async respondToTranslation(request: Request, response: Response) {
        return response.json({ route: "respondToTranslation" });
    }
    
    async listReports(request: Request, response: Response) {
        return response.json({ route: "listReports" });
    }
    
    async respondToReport(request: Request, response: Response) {
        return response.json({ route: "respondToReport" });
    }
    
    async banUser(request: Request, response: Response) {
        return response.json({ route: "banUser" });
    }
    
    async changeUserRole(request: Request, response: Response) {
        return response.json({ route: "changeUserRole" });
    }
    
    async hidePuzzle(request: Request, response: Response) {
        return response.json({ route: "hidePuzzle" });
    }
}

const moderationController = new ModerationController();

export { moderationController };
