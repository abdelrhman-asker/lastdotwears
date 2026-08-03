import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { createSlug } from '../../../common/utils/catalog-normalization.util.js';
import { hasPrismaCode } from '../../../common/utils/prisma-error.util.js';
import type {
  CreateBrandDto,
  ListBrandsQueryDto,
  PaginatedBrandsResponseDto,
  UpdateBrandDto,
} from '../dto/brand.dto.js';
import { BrandResponseDto } from '../dto/brand.dto.js';
import {
  BRANDS_REPOSITORY,
  type BrandsRepository,
} from '../interfaces/brands-repository.interface.js';

@Injectable()
export class BrandsService {
  constructor(@Inject(BRANDS_REPOSITORY) private readonly repository: BrandsRepository) {}

  async listPublic(): Promise<BrandResponseDto[]> {
    return (await this.repository.listPublic()).map((brand) => BrandResponseDto.from(brand));
  }

  async getPublic(slug: string): Promise<BrandResponseDto> {
    const brand = await this.repository.findPublicBySlug(slug);
    if (!brand) throw new NotFoundException('Brand not found.');
    return BrandResponseDto.from(brand);
  }

  async listAdmin(query: ListBrandsQueryDto): Promise<PaginatedBrandsResponseDto> {
    const result = await this.repository.listAdmin({
      page: query.page,
      limit: query.limit,
      ...(query.search ? { search: query.search } : {}),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
    });
    return {
      items: result.items.map((brand) => BrandResponseDto.from(brand)),
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
    };
  }

  async getAdmin(id: string): Promise<BrandResponseDto> {
    const brand = await this.repository.findById(id);
    if (!brand) throw new NotFoundException('Brand not found.');
    return BrandResponseDto.from(brand);
  }

  async create(input: CreateBrandDto): Promise<BrandResponseDto> {
    const slug = input.slug ?? createSlug(input.name);
    if (!slug) throw new BadRequestException('Provide an English slug for this brand name.');
    try {
      return BrandResponseDto.from(
        await this.repository.create({
          name: input.name,
          slug,
          description: input.description || null,
          websiteUrl: input.websiteUrl || null,
          isActive: input.isActive ?? true,
        }),
      );
    } catch (error) {
      if (hasPrismaCode(error, 'P2002')) throw new ConflictException('Brand slug already exists.');
      throw error;
    }
  }

  async update(id: string, input: UpdateBrandDto): Promise<BrandResponseDto> {
    await this.getAdmin(id);
    const slug = input.slug;
    try {
      const brand = await this.repository.update(id, {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(slug !== undefined ? { slug } : {}),
        ...(input.description !== undefined ? { description: input.description || null } : {}),
        ...(input.websiteUrl !== undefined ? { websiteUrl: input.websiteUrl || null } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      });
      if (!brand) throw new NotFoundException('Brand not found.');
      return BrandResponseDto.from(brand);
    } catch (error) {
      if (hasPrismaCode(error, 'P2002')) throw new ConflictException('Brand slug already exists.');
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    await this.getAdmin(id);
    if ((await this.repository.productCount(id)) > 0) {
      throw new ConflictException('Move this brand’s products before deleting it.');
    }
    if (!(await this.repository.softDelete(id))) throw new NotFoundException('Brand not found.');
  }
}
