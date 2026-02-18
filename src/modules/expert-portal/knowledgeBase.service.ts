/**
 * Knowledge Base Service
 *
 * Manages the agricultural knowledge repository lifecycle:
 * creation, editorial review, publishing, versioning, search, and engagement analytics.
 */

import KnowledgeArticle from './knowledgeArticle.model';
import ExpertProfile from './expertProfile.model';
import AuditService from '../audit/audit.service';
import { AppError } from '../../common/errors/AppError';
import logger from '../../common/utils/logger';
import {
  IKnowledgeArticle,
  KnowledgeCategory,
  PublicationStatus,
} from './expert.types';

interface CreateArticleDTO {
  title: string;
  summary: string;
  content: string;
  farmerFriendlySummary?: string;
  category: KnowledgeCategory;
  tags?: string[];
  cropTypes?: string[];
  regions?: string[];
  seasons?: string[];
  coAuthors?: string[];
  references?: string[];
  coverImageUrl?: string;
}

interface UpdateArticleDTO extends Partial<CreateArticleDTO> {
  changeLog?: string;
}

interface SearchArticleDTO {
  query?: string;
  category?: KnowledgeCategory;
  cropType?: string;
  region?: string;
  season?: string;
  tags?: string[];
  status?: PublicationStatus;
  page?: number;
  limit?: number;
  sortBy?: 'publishedAt' | 'viewCount' | 'helpfulCount';
  sortOrder?: 'asc' | 'desc';
}

export class KnowledgeBaseService {
  /**
   * Create a new knowledge article (draft state)
   */
  async createArticle(
    authorExpertId: string,
    data: CreateArticleDTO
  ): Promise<IKnowledgeArticle> {
    const expert = await ExpertProfile.findById(authorExpertId);
    if (!expert) throw new AppError('Expert profile not found', 404);

    const article = await KnowledgeArticle.create({
      ...data,
      primaryAuthor: authorExpertId,
      coAuthors: data.coAuthors || [],
      tags: data.tags || [],
      cropTypes: data.cropTypes || [],
      regions: data.regions || [],
      seasons: data.seasons || [],
      references: data.references || [],
      status: PublicationStatus.DRAFT,
      version: 1,
    });

    await AuditService.log({
      userId: expert.user.toString(),
      action: 'KNOWLEDGE_ARTICLE_CREATED',
      resource: 'KnowledgeArticle',
      resourceId: article._id.toString(),
      details: { metadata: { title: data.title, category: data.category } },
      status: 'success',
    });

    logger.info(`Knowledge article "${data.title}" created by expert ${authorExpertId}`);
    return article;
  }

  /**
   * Update an article (only author or admin)
   */
  async updateArticle(
    articleId: string,
    expertId: string,
    data: UpdateArticleDTO,
    isAdmin = false
  ): Promise<IKnowledgeArticle> {
    const article = await KnowledgeArticle.findById(articleId);
    if (!article) throw new AppError('Article not found', 404);

    if (!isAdmin && article.primaryAuthor.toString() !== expertId) {
      throw new AppError('Only the author can update this article', 403);
    }

    if (article.status === PublicationStatus.PUBLISHED) {
      // Create new version for published articles
      const newArticle = await this.createNewVersion(article, expertId, data);
      return newArticle;
    }

    Object.assign(article, data);
    await article.save();
    return article;
  }

  /**
   * Submit article for editorial review
   */
  async submitForReview(
    articleId: string,
    expertId: string
  ): Promise<IKnowledgeArticle> {
    const article = await KnowledgeArticle.findById(articleId);
    if (!article) throw new AppError('Article not found', 404);

    if (article.primaryAuthor.toString() !== expertId) {
      throw new AppError('Only the author can submit for review', 403);
    }
    if (article.status !== PublicationStatus.DRAFT) {
      throw new AppError('Only draft articles can be submitted for review', 400);
    }

    article.status = PublicationStatus.UNDER_REVIEW;
    await article.save();

    const expert = await ExpertProfile.findById(expertId);
    await AuditService.log({
      userId: expert?.user.toString() ?? expertId,
      action: 'ARTICLE_SUBMITTED_FOR_REVIEW',
      resource: 'KnowledgeArticle',
      resourceId: articleId,
      status: 'success',
    });

    return article;
  }

  /**
   * Reviewer approves or rejects an article
   */
  async reviewArticle(
    articleId: string,
    reviewerExpertId: string,
    approved: boolean,
    notes?: string
  ): Promise<IKnowledgeArticle> {
    const article = await KnowledgeArticle.findById(articleId);
    if (!article) throw new AppError('Article not found', 404);

    if (article.status !== PublicationStatus.UNDER_REVIEW) {
      throw new AppError('Article is not under review', 400);
    }

    article.reviewedBy = reviewerExpertId as unknown as IKnowledgeArticle['reviewedBy'];
    article.reviewedAt = new Date();
    article.reviewNotes = notes;
    article.status = approved ? PublicationStatus.APPROVED : PublicationStatus.REJECTED;

    if (!article.reviewers.map(String).includes(reviewerExpertId)) {
      article.reviewers.push(reviewerExpertId as unknown as IKnowledgeArticle['reviewers'][0]);
    }

    await article.save();

    const expert = await ExpertProfile.findById(reviewerExpertId);
    await AuditService.log({
      userId: expert?.user.toString() ?? reviewerExpertId,
      action: approved ? 'ARTICLE_APPROVED' : 'ARTICLE_REJECTED',
      resource: 'KnowledgeArticle',
      resourceId: articleId,
      details: { metadata: { notes } },
      status: 'success',
    });

    return article;
  }

  /**
   * Publish an approved article
   */
  async publishArticle(
    articleId: string,
    approverExpertId: string
  ): Promise<IKnowledgeArticle> {
    const article = await KnowledgeArticle.findById(articleId);
    if (!article) throw new AppError('Article not found', 404);

    if (article.status !== PublicationStatus.APPROVED) {
      throw new AppError('Only approved articles can be published', 400);
    }

    article.status = PublicationStatus.PUBLISHED;
    article.publishedAt = new Date();
    article.approvedBy = approverExpertId as unknown as IKnowledgeArticle['approvedBy'];
    article.approvedAt = new Date();
    await article.save();

    // Update author publication count
    await ExpertProfile.findByIdAndUpdate(article.primaryAuthor, {
      $inc: { 'performance.publicationsCount': 1 },
    });

    const expert = await ExpertProfile.findById(approverExpertId);
    await AuditService.log({
      userId: expert?.user.toString() ?? approverExpertId,
      action: 'ARTICLE_PUBLISHED',
      resource: 'KnowledgeArticle',
      resourceId: articleId,
      status: 'success',
    });

    logger.info(`Knowledge article "${article.title}" published`);
    return article;
  }

  /**
   * Archive an article
   */
  async archiveArticle(
    articleId: string,
    _expertId: string
  ): Promise<IKnowledgeArticle> {
    const article = await KnowledgeArticle.findById(articleId);
    if (!article) throw new AppError('Article not found', 404);

    article.status = PublicationStatus.ARCHIVED;
    article.archivedAt = new Date();
    await article.save();
    return article;
  }

  /**
   * Search and list knowledge articles (public-facing)
   */
  async searchArticles(filters: SearchArticleDTO): Promise<{
    articles: IKnowledgeArticle[];
    total: number;
    page: number;
    pages: number;
  }> {
    const {
      query,
      category,
      cropType,
      region,
      season,
      tags,
      status = PublicationStatus.PUBLISHED,
      page = 1,
      limit = 20,
      sortBy = 'publishedAt',
      sortOrder = 'desc',
    } = filters;

    const dbQuery: Record<string, unknown> = { status };

    if (query) {
      (dbQuery as Record<string, unknown>).$text = { $search: query };
    }
    if (category) dbQuery.category = category;
    if (cropType) dbQuery.cropTypes = cropType;
    if (region) dbQuery.regions = region;
    if (season) dbQuery.seasons = season;
    if (tags && tags.length) dbQuery.tags = { $in: tags };

    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (page - 1) * limit;

    const [articles, total] = await Promise.all([
      KnowledgeArticle.find(dbQuery)
        .populate('primaryAuthor', 'displayName title specializations')
        .select('-content -translations')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      KnowledgeArticle.countDocuments(dbQuery),
    ]);

    return { articles, total, page, pages: Math.ceil(total / limit) };
  }

  /**
   * Get full article by ID or slug (increments view count)
   */
  async getArticle(idOrSlug: string): Promise<IKnowledgeArticle> {
    const query = idOrSlug.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: idOrSlug }
      : { slug: idOrSlug };

    const article = await KnowledgeArticle.findOneAndUpdate(
      { ...query, status: PublicationStatus.PUBLISHED },
      { $inc: { viewCount: 1 } },
      { new: true }
    )
      .populate('primaryAuthor', 'displayName title specializations bio')
      .populate('coAuthors', 'displayName title')
      .populate('relatedArticles', 'title slug category summary');

    if (!article) throw new AppError('Article not found', 404);
    return article;
  }

  /**
   * Rate article as helpful/not helpful
   */
  async rateArticle(
    articleId: string,
    helpful: boolean
  ): Promise<{ helpfulCount: number; notHelpfulCount: number }> {
    const update = helpful
      ? { $inc: { helpfulCount: 1 } }
      : { $inc: { notHelpfulCount: 1 } };

    const article = await KnowledgeArticle.findByIdAndUpdate(articleId, update, { new: true })
      .select('helpfulCount notHelpfulCount');
    if (!article) throw new AppError('Article not found', 404);

    return {
      helpfulCount: article.helpfulCount,
      notHelpfulCount: article.notHelpfulCount,
    };
  }

  /**
   * Add translation to an article
   */
  async addTranslation(
    articleId: string,
    _expertId: string,
    locale: string,
    title: string,
    summary: string,
    content: string
  ): Promise<IKnowledgeArticle> {
    const article = await KnowledgeArticle.findById(articleId);
    if (!article) throw new AppError('Article not found', 404);

    const existingIndex = article.translations.findIndex((t) => t.locale === locale);
    if (existingIndex >= 0) {
      article.translations[existingIndex] = { locale, title, summary, content };
    } else {
      article.translations.push({ locale, title, summary, content });
    }

    await article.save();
    return article;
  }

  /**
   * Get articles authored by a specific expert
   */
  async getExpertArticles(
    expertId: string,
    status?: PublicationStatus
  ): Promise<IKnowledgeArticle[]> {
    const query: Record<string, unknown> = { primaryAuthor: expertId };
    if (status) query.status = status;

    return KnowledgeArticle.find(query)
      .sort({ createdAt: -1 })
      .select('title slug category status version createdAt publishedAt viewCount');
  }

  /**
   * Get categories with article counts
   */
  async getCategoryStats(): Promise<Array<{ category: string; count: number }>> {
    return KnowledgeArticle.aggregate([
      { $match: { status: PublicationStatus.PUBLISHED } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $project: { category: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 } },
    ]);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async createNewVersion(
    existingArticle: IKnowledgeArticle,
    _expertId: string,
    data: UpdateArticleDTO
  ): Promise<IKnowledgeArticle> {
    const newArticle = await KnowledgeArticle.create({
      ...existingArticle.toObject(),
      _id: undefined,
      status: PublicationStatus.DRAFT,
      version: existingArticle.version + 1,
      previousVersion: existingArticle._id,
      changeLog: data.changeLog || 'Updated version',
      publishedAt: undefined,
      approvedBy: undefined,
      approvedAt: undefined,
      reviewedBy: undefined,
      reviewedAt: undefined,
      viewCount: 0,
      helpfulCount: 0,
      notHelpfulCount: 0,
      downloadCount: 0,
      ...data,
    });

    return newArticle;
  }
}

export default new KnowledgeBaseService();
