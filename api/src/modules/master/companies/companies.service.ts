import { ConflictException, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import { companies, type Company } from '../../../db/companies.schema';
import { companyDocuments, type CompanyDocument } from '../../../db/company-documents.schema';
import type { CreateCompanyDto } from './companies.controller';

export type CompanyWithDocuments = Company & { documents: CompanyDocument[] };

@Injectable()
export class CompaniesService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  private normalizeOptional(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  async findAll(): Promise<CompanyWithDocuments[]> {
    const [companyRows, documentRows] = await Promise.all([
      this.db.select().from(companies),
      this.db.select().from(companyDocuments),
    ]);

    const docsByCompany = new Map<number, CompanyDocument[]>();
    for (const doc of documentRows) {
      const collection = docsByCompany.get(doc.companyId) ?? [];
      collection.push(doc);
      docsByCompany.set(doc.companyId, collection);
    }

    return companyRows.map((company) => ({
      ...company,
      branchAddresses: Array.isArray(company.branchAddresses) ? company.branchAddresses : [],
      tenderKeywords: Array.isArray(company.tenderKeywords) ? company.tenderKeywords : [],
      documents: docsByCompany.get(company.id) ?? [],
    }));
  }

  async create(data: CreateCompanyDto): Promise<CompanyWithDocuments> {
    const branchAddresses = (data.branchAddresses ?? [])
      .map((addr) => addr.trim())
      .filter((addr) => addr.length > 0);
    const tenderKeywords = (data.tenderKeywords ?? [])
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    try {
      return await this.db.transaction(async (tx) => {
        const [company] = (await tx
          .insert(companies)
          .values({
            name: data.name.trim(),
            entityType: data.entityType.trim(),
            registeredAddress: data.registeredAddress.trim(),
            branchAddresses,
            about: this.normalizeOptional(data.about),
            website: this.normalizeOptional(data.website),
            phone: this.normalizeOptional(data.phone),
            email: this.normalizeOptional(data.email),
            fax: this.normalizeOptional(data.fax),
            signatoryName: this.normalizeOptional(data.signatoryName),
            designation: this.normalizeOptional(data.designation),
            tenderKeywords,
          })
          .returning()) as Company[];

        const documentsPayload = (data.documents ?? [])
          .map((doc) => ({
            companyId: company.id,
            name: doc.name.trim(),
            size: doc.size ?? 0,
            isFolder: doc.isFolder ?? false,
          }))
          .filter((doc) => doc.name.length > 0);

        let documents: CompanyDocument[] = [];
        if (documentsPayload.length > 0) {
          documents = (await tx
            .insert(companyDocuments)
            .values(documentsPayload)
            .returning()) as CompanyDocument[];
        }

        return {
          ...company,
          documents,
        } satisfies CompanyWithDocuments;
      });
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException('Company name already exists');
      }
      if (error?.message && typeof error.message === 'string' && error.message.includes('relation "companies"')) {
        throw new InternalServerErrorException('Companies tables missing. Run database migrations and try again.');
      }
      // eslint-disable-next-line no-console
      console.error('Failed to create company', error);
      throw new InternalServerErrorException('Unable to create company');
    }
  }
}
