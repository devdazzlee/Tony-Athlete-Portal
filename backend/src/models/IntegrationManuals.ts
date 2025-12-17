import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface IntegrationManual {
  id: string;
  accountId: string;
  title: string;
  description: string;
  category: 'AFFILIATE' | 'MERCHANT' | 'DEVELOPER' | 'ADMIN' | 'GENERAL';
  type: 'GUIDE' | 'TUTORIAL' | 'API_DOCS' | 'FAQ' | 'TROUBLESHOOTING' | 'BEST_PRACTICES';
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  content: string;
  htmlContent: string;
  tags: string[];
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  estimatedTime: number; // minutes
  prerequisites: string[];
  steps: ManualStep[];
  codeExamples: CodeExample[];
  screenshots: Screenshot[];
  videos: Video[];
  attachments: Attachment[];
  seo: SEOSettings;
  settings: ManualSettings;
  stats: ManualStats;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface ManualStep {
  id: string;
  title: string;
  description: string;
  content: string;
  order: number;
  isOptional: boolean;
  estimatedTime: number; // minutes
  codeExamples: CodeExample[];
  screenshots: Screenshot[];
  videos: Video[];
  attachments: Attachment[];
}

export interface CodeExample {
  id: string;
  title: string;
  description: string;
  language: string;
  code: string;
  output?: string;
  explanation: string;
  isExecutable: boolean;
  dependencies?: string[];
  version?: string;
}

export interface Screenshot {
  id: string;
  title: string;
  description: string;
  url: string;
  alt: string;
  width: number;
  height: number;
  order: number;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnail: string;
  duration: number; // seconds
  order: number;
  platform: 'YOUTUBE' | 'VIMEO' | 'SELF_HOSTED' | 'OTHER';
}

export interface Attachment {
  id: string;
  title: string;
  description: string;
  url: string;
  filename: string;
  size: number; // bytes
  type: string;
  order: number;
}

export interface SEOSettings {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: string;
  robots: string;
  sitemap: boolean;
}

export interface ManualSettings {
  allowComments: boolean;
  allowRating: boolean;
  allowSharing: boolean;
  requireLogin: boolean;
  showTableOfContents: boolean;
  showProgress: boolean;
  showEstimatedTime: boolean;
  showDifficulty: boolean;
  showPrerequisites: boolean;
  customFields: Record<string, any>;
}

export interface ManualStats {
  views: number;
  uniqueViews: number;
  completions: number;
  averageRating: number;
  totalRatings: number;
  shares: number;
  downloads: number;
  lastViewed?: Date;
  lastCompleted?: Date;
}

export interface ManualComment {
  id: string;
  manualId: string;
  parentId?: string;
  userId: string;
  content: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SPAM';
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ManualRating {
  id: string;
  manualId: string;
  userId: string;
  rating: number; // 1-5
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ManualProgress {
  id: string;
  manualId: string;
  userId: string;
  currentStep: number;
  completedSteps: number[];
  totalSteps: number;
  progress: number; // percentage
  timeSpent: number; // minutes
  isCompleted: boolean;
  startedAt: Date;
  lastActivity: Date;
  completedAt?: Date;
}

export interface ManualCategory {
  id: string;
  accountId: string;
  name: string;
  description: string;
  slug: string;
  parentId?: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ManualTag {
  id: string;
  accountId: string;
  name: string;
  description: string;
  slug: string;
  color: string;
  usageCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class IntegrationManualsModel {
  static async create(data: any): Promise<any> {
    return (await prisma.integrationManual.create({
      data: {
        accountId: data.accountId!,
        title: data.title!,
        content: data.content!,
        category: data.category!,
        tags: data.tags || [],
        isPublic: data.isPublic || false,
        createdBy: data.createdBy!,
      }
    })) as any;
  }

  static async findById(id: string): Promise<any | null> {
    return (await prisma.integrationManual.findUnique({
      where: { id }
    })) as any | null;
  }

  static async findBySlug(accountId: string, slug: string): Promise<any | null> {
    return (await prisma.integrationManual.findFirst({
      where: {
        accountId,
        title: slug
      }
    })) as any | null;
  }

  static async update(id: string, data: any): Promise<any> {
    return (await prisma.integrationManual.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    })) as any;
  }

  static async delete(id: string): Promise<void> {
    await prisma.integrationManual.delete({
      where: { id }
    });
  }

  static async list(accountId: string, filters: any = {}): Promise<any[]> {
    const where: any = { accountId };
    
    if (filters.category) where.category = filters.category;
    if (filters.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    return (await prisma.integrationManual.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })) as any[];
  }

  static async publish(id: string): Promise<any> {
    const manual = await this.findById(id);
    if (!manual) {
      throw new Error('Manual not found');
    }

    return await this.update(id, {
      isPublic: true
    });
  }

  static async unpublish(id: string): Promise<any> {
    return await this.update(id, {
      isPublic: false
    });
  }

  static async archive(id: string): Promise<any> {
    return await this.update(id, {
      isPublic: false
    });
  }

  static async recordView(id: string, userId?: string, ipAddress?: string): Promise<void> {
    const manual = await this.findById(id);
    if (!manual) return;

    // Update view count
    const stats = { ...manual.stats };
    stats.views++;
    
    if (userId) {
      stats.uniqueViews++;
    }
    
    stats.lastViewed = new Date();

    await this.update(id, { stats });
  }

  static async recordCompletion(id: string, userId: string): Promise<void> {
    const manual = await this.findById(id);
    if (!manual) return;

    // Update completion count
    const stats = { ...manual.stats };
    stats.completions++;
    stats.lastCompleted = new Date();

    await this.update(id, { stats });

    // Update user progress
    await this.updateProgress(id, userId, manual.steps.length, true);
  }

  static async addComment(manualId: string, userId: string, content: string, parentId?: string, ipAddress: string = '127.0.0.1', userAgent: string = 'System'): Promise<any> {
    return (await prisma.manualComment.create({
      data: {
        manualId,
        userId,
        content,
        isInternal: false
      }
    })) as any;
  }

  static async findCommentById(id: string): Promise<any | null> {
    return (await prisma.manualComment.findUnique({
      where: { id }
    })) as any | null;
  }

  static async updateCommentStatus(id: string, status: string): Promise<any> {
    return (await prisma.manualComment.update({
      where: { id },
      data: {
        updatedAt: new Date()
      }
    })) as any;
  }

  static async deleteComment(id: string): Promise<void> {
    await prisma.manualComment.delete({
      where: { id }
    });
  }

  static async getComments(manualId: string, filters: any = {}): Promise<any[]> {
    const where: any = { manualId };

    return (await prisma.manualComment.findMany({
      where,
      orderBy: { createdAt: 'asc' }
    })) as any[];
  }

  static async addRating(manualId: string, userId: string, rating: number, comment?: string): Promise<ManualRating> {
    // Check if user already rated
    const existingRating = await prisma.manualRating.findFirst({
      where: { manualId, userId }
    });

    if (existingRating) {
      // Update existing rating
      return await prisma.manualRating.update({
        where: { id: existingRating.id },
        data: {
          rating,
          comment,
          updatedAt: new Date()
        }
      }) as ManualRating;
    } else {
      // Create new rating
      return await prisma.manualRating.create({
        data: {
          manualId,
          userId,
          rating,
          comment
        }
      }) as ManualRating;
    }
  }

  static async getRatings(manualId: string): Promise<ManualRating[]> {
    return await prisma.manualRating.findMany({
      where: { manualId },
      orderBy: { createdAt: 'desc' }
    }) as ManualRating[];
  }

  static async updateRatingStats(manualId: string): Promise<void> {
    const ratings = await this.getRatings(manualId);
    
    if (ratings.length === 0) return;

    const totalRatings = ratings.length;
    const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings;

    const manual = await this.findById(manualId);
    if (!manual) return;

    const stats = { ...manual.stats };
    stats.averageRating = averageRating;
    stats.totalRatings = totalRatings;

    await this.update(manualId, { stats });
  }

  static async updateProgress(manualId: string, userId: string, currentStep: number, isCompleted: boolean = false): Promise<any> {
    const existingProgress = await prisma.manualProgress.findFirst({
      where: { manualId, userId }
    });

    const progress = isCompleted ? 100 : (currentStep / 10) * 100; // Simplified progress calculation

    if (existingProgress) {
      return (await prisma.manualProgress.update({
        where: { id: existingProgress.id },
        data: {
          progress,
          completed: isCompleted,
          lastReadAt: new Date(),
          updatedAt: new Date()
        }
      })) as any;
    } else {
      return (await prisma.manualProgress.create({
        data: {
          manualId,
          userId,
          progress,
          completed: isCompleted,
          lastReadAt: new Date()
        }
      })) as any;
    }
  }

  static async getProgress(manualId: string, userId: string): Promise<any | null> {
    return (await prisma.manualProgress.findFirst({
      where: { manualId, userId }
    })) as any | null;
  }

  static async createCategory(data: any): Promise<any> {
    return (await prisma.manualCategory.create({
      data: {
        name: data.name!,
        description: data.description || '',
        order: data.order || 0,
        status: data.status || 'ACTIVE'
      }
    })) as any;
  }

  static async findCategoryById(id: string): Promise<any | null> {
    return (await prisma.manualCategory.findUnique({
      where: { id }
    })) as any | null;
  }

  static async updateCategory(id: string, data: any): Promise<any> {
    return (await prisma.manualCategory.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    })) as any;
  }

  static async deleteCategory(id: string): Promise<void> {
    await prisma.manualCategory.delete({
      where: { id }
    });
  }

  static async listCategories(accountId: string): Promise<any[]> {
    return (await prisma.manualCategory.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { order: 'asc' }
    })) as any[];
  }

  static async createTag(data: any): Promise<any> {
    return (await prisma.manualTag.create({
      data: {
        name: data.name!,
        description: data.description || ''
      }
    })) as any;
  }

  static async findTagById(id: string): Promise<any | null> {
    return (await prisma.manualTag.findUnique({
      where: { id }
    })) as any | null;
  }

  static async updateTag(id: string, data: any): Promise<any> {
    return (await prisma.manualTag.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    })) as any;
  }

  static async deleteTag(id: string): Promise<void> {
    await prisma.manualTag.delete({
      where: { id }
    });
  }

  static async listTags(accountId: string): Promise<any[]> {
    return (await prisma.manualTag.findMany({
      orderBy: { createdAt: 'desc' }
    })) as any[];
  }

  static async getManualStats(accountId: string): Promise<any> {
    const manuals = await this.list(accountId);
    const categories = await this.listCategories(accountId);
    const tags = await this.listTags(accountId);

    const stats = {
      totalManuals: manuals.length,
      publishedManuals: manuals.filter(m => m.status === 'PUBLISHED').length,
      draftManuals: manuals.filter(m => m.status === 'DRAFT').length,
      archivedManuals: manuals.filter(m => m.status === 'ARCHIVED').length,
      totalCategories: categories.length,
      totalTags: tags.length,
      totalViews: manuals.reduce((sum, m) => sum + m.stats.views, 0),
      totalCompletions: manuals.reduce((sum, m) => sum + m.stats.completions, 0),
      byCategory: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      byDifficulty: {} as Record<string, number>,
      byStatus: {} as Record<string, number>
    };

    // Aggregate by category, type, difficulty, and status
    manuals.forEach(manual => {
      stats.byCategory[manual.category] = (stats.byCategory[manual.category] || 0) + 1;
      stats.byType[manual.type] = (stats.byType[manual.type] || 0) + 1;
      stats.byDifficulty[manual.difficulty] = (stats.byDifficulty[manual.difficulty] || 0) + 1;
      stats.byStatus[manual.status] = (stats.byStatus[manual.status] || 0) + 1;
    });

    return stats;
  }

  static async createDefaultManuals(accountId: string): Promise<IntegrationManual[]> {
    const defaultManuals = [
      {
        title: 'Getting Started with TC Nutrition Athlete Portal',
        description: 'Learn how to set up your TC Nutrition Athlete Portal account and start tracking your first affiliate links',
        category: 'AFFILIATE' as const,
        type: 'GUIDE' as const,
        difficulty: 'BEGINNER' as const,
        estimatedTime: 15,
        prerequisites: [],
        tags: ['getting-started', 'setup', 'basics'],
        content: 'This guide will walk you through the process of setting up your TC Nutrition Athlete Portal account...',
        htmlContent: '<h1>Getting Started with TC Nutrition Athlete Portal</h1><p>This guide will walk you through the process of setting up your TC Nutrition Athlete Portal account...</p>',
        steps: [
          {
            id: 'step1',
            title: 'Create Your Account',
            description: 'Sign up for a TC Nutrition Athlete Portal account',
            content: 'Visit the TC Nutrition Athlete Portal website and click the "Sign Up" button...',
            order: 1,
            isOptional: false,
            estimatedTime: 5,
            codeExamples: [],
            screenshots: [],
            videos: [],
            attachments: []
          },
          {
            id: 'step2',
            title: 'Verify Your Email',
            description: 'Check your email and verify your account',
            content: 'Check your email inbox for a verification email from TC Nutrition Athlete Portal...',
            order: 2,
            isOptional: false,
            estimatedTime: 2,
            codeExamples: [],
            screenshots: [],
            videos: [],
            attachments: []
          },
          {
            id: 'step3',
            title: 'Create Your First Link',
            description: 'Generate your first affiliate tracking link',
            content: 'Navigate to the "Links" section and click "Create New Link"...',
            order: 3,
            isOptional: false,
            estimatedTime: 8,
            codeExamples: [],
            screenshots: [],
            videos: [],
            attachments: []
          }
        ],
        codeExamples: [],
        screenshots: [],
        videos: [],
        attachments: []
      },
      {
        title: 'API Integration Guide',
        description: 'Learn how to integrate TC Nutrition Athlete Portal with your application using our REST API',
        category: 'DEVELOPER' as const,
        type: 'API_DOCS' as const,
        difficulty: 'INTERMEDIATE' as const,
        estimatedTime: 45,
        prerequisites: ['Basic programming knowledge', 'Understanding of REST APIs'],
        tags: ['api', 'integration', 'developer', 'rest'],
        content: 'This guide covers the TC Nutrition Athlete Portal REST API and how to integrate it with your application...',
        htmlContent: '<h1>API Integration Guide</h1><p>This guide covers the TC Nutrition Athlete Portal REST API and how to integrate it with your application...</p>',
        steps: [
          {
            id: 'step1',
            title: 'Get Your API Key',
            description: 'Generate an API key from your account settings',
            content: 'Navigate to Settings > API Keys and click "Generate New Key"...',
            order: 1,
            isOptional: false,
            estimatedTime: 5,
            codeExamples: [],
            screenshots: [],
            videos: [],
            attachments: []
          },
          {
            id: 'step2',
            title: 'Make Your First API Call',
            description: 'Test the API with a simple request',
            content: 'Use curl or your preferred HTTP client to make a test request...',
            order: 2,
            isOptional: false,
            estimatedTime: 10,
            codeExamples: [
              {
                id: 'example1',
                title: 'Basic API Request',
                description: 'Example of a basic API request using curl',
                language: 'bash',
                code: 'curl -X GET "https://api.tcnutrition.com/v1/links" \\\n  -H "Authorization: Bearer YOUR_API_KEY"',
                explanation: 'This example shows how to make a basic GET request to retrieve your links.',
                isExecutable: true
              }
            ],
            screenshots: [],
            videos: [],
            attachments: []
          }
        ],
        codeExamples: [
          {
            id: 'example1',
            title: 'Basic API Request',
            description: 'Example of a basic API request using curl',
            language: 'bash',
            code: 'curl -X GET "https://api.trackdesk.com/v1/links" \\\n  -H "Authorization: Bearer YOUR_API_KEY"',
            explanation: 'This example shows how to make a basic GET request to retrieve your links.',
            isExecutable: true
          }
        ],
        screenshots: [],
        videos: [],
        attachments: []
      }
    ];

    const createdManuals: IntegrationManual[] = [];
    for (const manualData of defaultManuals) {
      const manual = await this.create({
        accountId,
        ...manualData
      });
      createdManuals.push(manual);
    }

    return createdManuals;
  }

  static async getIntegrationManualsDashboard(accountId: string): Promise<any> {
    const manuals = await this.list(accountId);
    const categories = await this.listCategories(accountId);
    const tags = await this.listTags(accountId);
    const stats = await this.getManualStats(accountId);

    return {
      manuals,
      categories,
      tags,
      stats
    };
  }
}


