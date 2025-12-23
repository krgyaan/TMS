import * as fs from "fs";
import * as path from "path";
import * as Handlebars from "handlebars";

const isProd = process.env.NODE_ENV === "production";

export function renderTemplateFromPath(basePath: string, templateName: string, context: Record<string, any>): string {
    const rootDir = isProd ? "dist" : "src";

    const templatePath = path.join(process.cwd(), rootDir, basePath, `${templateName}.hbs`);

    if (!fs.existsSync(templatePath)) {
        throw new Error(`Mail template not found: ${templatePath}`);
    }

    const source = fs.readFileSync(templatePath, "utf-8");
    const template = Handlebars.compile(source);
    return template(context);
}
