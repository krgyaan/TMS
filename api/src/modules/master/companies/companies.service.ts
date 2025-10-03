import { ConflictException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import { companies, type Company } from '../../../db/companies.schema';
import { companyDocuments, type CompanyDocument } from '../../../db/company-documents.schema';
import type { CompanyDetailsDto, CompanyDocumentsDto } from './companies.controller';

export type CompanyWithDocuments = Company & { documents: CompanyDocument[] };

@Injectable()
export class CompaniesService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  private normalizeOptional(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private hydrateCompany(company: Company, documents: CompanyDocument[]): CompanyWithDocuments {
    return {
      ...company,
      branchAddresses: Array.isArray(company.branchAddresses) ? company.branchAddresses : [],
      tenderKeywords: Array.isArray(company.tenderKeywords) ? company.tenderKeywords : [],
      documents,
    } satisfies CompanyWithDocuments;
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

    return companyRows.map((company) => this.hydrateCompany(company, docsByCompany.get(company.id) ?? []));
  }

  async findOne(id: number): Promise<CompanyWithDocuments | null> {
    const rows = (await this.db.select().from(companies).where(eq(companies.id, id)).limit(1)) as Company[];
    const company = rows.at(0);
    if (!company) {
      return null;
    }
    const documents = (await this.db
      .select()
      .from(companyDocuments)
      .where(eq(companyDocuments.companyId, id))) as CompanyDocument[];
    return this.hydrateCompany(company, documents);
  }

  async create(data: CompanyDetailsDto): Promise<CompanyWithDocuments> {
    const branchAddresses = (data.branchAddresses ?? [])
      .map((addr) => addr.trim())
      .filter((addr) => addr.length > 0);
    const tenderKeywords = (data.tenderKeywords ?? [])
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    try {
      const [company] = (await this.db
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

      return this.hydrateCompany(company, []);
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

  async update(id: number, data: CompanyDetailsDto): Promise<CompanyWithDocuments> {
    const branchAddresses = (data.branchAddresses ?? [])
      .map((addr) => addr.trim())
      .filter((addr) => addr.length > 0);
    const tenderKeywords = (data.tenderKeywords ?? [])
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    try {
      const result = await this.db.transaction(async (tx) => {
        const [company] = (await tx
          .update(companies)
          .set({
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
            updatedAt: new Date(),
          })
          .where(eq(companies.id, id))
          .returning()) as Company[];

        if (!company) {
          throw new NotFoundException('Company not found');
        }

        const documents = (await tx
          .select()
          .from(companyDocuments)
          .where(eq(companyDocuments.companyId, id))) as CompanyDocument[];

        return this.hydrateCompany(company, documents);
      });

      return result;
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error?.code === '23505') {
        throw new ConflictException('Company name already exists');
      }
      if (error?.message && typeof error.message === 'string' && error.message.includes('relation "companies"')) {
        throw new InternalServerErrorException('Companies tables missing. Run database migrations and try again.');
      }
      // eslint-disable-next-line no-console
      console.error(`Failed to update company ${id}`, error);
      throw new InternalServerErrorException('Unable to update company');
    }
  }

  async updateDocuments(id: number, payload: CompanyDocumentsDto['documents']): Promise<CompanyWithDocuments> {
    try {
      await this.db.transaction(async (tx) => {
        const rows = (await tx.select().from(companies).where(eq(companies.id, id)).limit(1)) as Company[];
        const company = rows.at(0);
        if (!company) {
          throw new NotFoundException('Company not found');
        }

        await tx.delete(companyDocuments).where(eq(companyDocuments.companyId, id));

        const documentsPayload = (payload ?? [])
          .map((doc) => ({
            companyId: id,
            name: doc.name.trim(),
            size: doc.size ?? 0,
            isFolder: doc.isFolder ?? false,
          }))
          .filter((doc) => doc.name.length > 0);

        if (documentsPayload.length > 0) {
          await tx.insert(companyDocuments).values(documentsPayload);
        }
      });

      const companyWithDocs = await this.findOne(id);
      if (!companyWithDocs) {
        throw new NotFoundException('Company not found');
      }
      return companyWithDocs;
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error?.message && typeof error.message === 'string' && error.message.includes('relation "company_documents"')) {
        throw new InternalServerErrorException('Company documents table missing. Run database migrations and try again.');
      }
      // eslint-disable-next-line no-console
      console.error(`Failed to update company documents for ${id}`, error);
      throw new InternalServerErrorException('Unable to update company documents');
    }
  }
}