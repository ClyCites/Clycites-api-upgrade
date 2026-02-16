import AuditLog, { IAuditLog } from './auditLog.model';
import SecurityEvent from '../security/securityEvent.model';

interface LogData {
  // Core
  userId?: string;
  organizationId?: string;
  
  // Action
  action: string;
  resource: string;
  resourceId?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint?: string;
  
  // Details
  details?: {
    before?: any;
    after?: any;
    changes?: any;
    metadata?: any;
  };
  
  // Context
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  
  // Result
  status?: 'success' | 'failure' | 'error';
  statusCode?: number;
  errorMessage?: string;
  
  // Security
  risk?: 'low' | 'medium' | 'high' | 'critical';
  isSuspicious?: boolean;
  securityFlags?: string[];
  
  // Performance
  duration?: number;
}

class AuditService {
  /**
   * Log an audit event
   */
  async log(data: LogData): Promise<IAuditLog> {
    // Calculate risk score
    const riskScore = this.calculateRiskScore(data);
    
    // Determine if suspicious
    const isSuspicious = data.isSuspicious || riskScore >= 70 || (data.securityFlags && data.securityFlags.length > 0);

    const auditLog = await AuditLog.create({
      user: data.userId,
      actor: {
        userId: data.userId,
        ipAddress: data.ipAddress || '0.0.0.0',
        userAgent: data.userAgent || 'unknown',
        sessionId: data.sessionId,
      },
      organization: data.organizationId,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      method: data.method || 'GET',
      endpoint: data.endpoint,
      details: data.details || {},
      status: data.status || 'success',
      statusCode: data.statusCode,
      errorMessage: data.errorMessage,
      securityContext: {
        risk: data.risk || this.getRiskLevel(riskScore),
        isSuspicious,
        flags: data.securityFlags || [],
      },
      duration: data.duration,
      timestamp: new Date(),
    });

    // If suspicious or high risk, create security event
    if (isSuspicious || riskScore >= 60) {
      await this.createSecurityEvent(data, riskScore);
    }

    return auditLog;
  }

  /**
   * Get audit logs for a user
   */
  async getUserLogs(
    userId: string,
    options?: {
      limit?: number;
      skip?: number;
      startDate?: Date;
      endDate?: Date;
      action?: string;
      resource?: string;
    }
  ): Promise<IAuditLog[]> {
    const query: any = { user: userId };

    if (options?.startDate || options?.endDate) {
      query.timestamp = {};
      if (options.startDate) query.timestamp.$gte = options.startDate;
      if (options.endDate) query.timestamp.$lte = options.endDate;
    }

    if (options?.action) query.action = options.action;
    if (options?.resource) query.resource = options.resource;

    return AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(options?.limit || 100)
      .skip(options?.skip || 0);
  }

  /**
   * Get audit logs for an organization
   */
  async getOrganizationLogs(
    organizationId: string,
    options?: {
      limit?: number;
      skip?: number;
      startDate?: Date;
      endDate?: Date;
      action?: string;
      resource?: string;
      userId?: string;
    }
  ): Promise<IAuditLog[]> {
    const query: any = { organization: organizationId };

    if (options?.startDate || options?.endDate) {
      query.timestamp = {};
      if (options.startDate) query.timestamp.$gte = options.startDate;
      if (options.endDate) query.timestamp.$lte = options.endDate;
    }

    if (options?.action) query.action = options.action;
    if (options?.resource) query.resource = options.resource;
    if (options?.userId) query.user = options.userId;

    return AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(options?.limit || 100)
      .skip(options?.skip || 0);
  }

  /**
   * Get audit logs for a resource
   */
  async getResourceLogs(
    resource: string,
    resourceId: string,
    options?: {
      limit?: number;
      skip?: number;
    }
  ): Promise<IAuditLog[]> {
    return AuditLog.find({
      resource,
      resourceId,
    })
      .sort({ timestamp: -1 })
      .limit(options?.limit || 50)
      .skip(options?.skip || 0);
  }

  /**
   * Get suspicious activities
   */
  async getSuspiciousActivities(options?: {
    userId?: string;
    organizationId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<IAuditLog[]> {
    const query: any = {
      'securityContext.isSuspicious': true,
    };

    if (options?.userId) query.user = options.userId;
    if (options?.organizationId) query.organization = options.organizationId;

    if (options?.startDate || options?.endDate) {
      query.timestamp = {};
      if (options.startDate) query.timestamp.$gte = options.startDate;
      if (options.endDate) query.timestamp.$lte = options.endDate;
    }

    return AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(options?.limit || 100);
  }

  /**
   * Calculate risk score based on event data
   */
  private calculateRiskScore(data: LogData): number {
    let score = 0;

    // Action-based risk
    const highRiskActions = [
      'user.deleted',
      'role.deleted',
      'permission.granted',
      'organization.deleted',
      'data.exported',
      'mfa.disabled',
    ];

    if (highRiskActions.some(action => data.action.includes(action))) {
      score += 30;
    }

    // Status-based risk
    if (data.status === 'failure') score += 20;
    if (data.status === 'error') score += 25;

    // Security flags
    if (data.securityFlags && data.securityFlags.length > 0) {
      score += data.securityFlags.length * 15;
    }

    // Manual override
    if (data.isSuspicious) score += 50;

    return Math.min(score, 100);
  }

  /**
   * Get risk level from score
   */
  private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Create security event from audit log
   */
  private async createSecurityEvent(data: LogData, riskScore: number): Promise<void> {
    const severity = this.getSeverityFromRisk(riskScore);

    await SecurityEvent.create({
      user: data.userId,
      organization: data.organizationId,
      type: this.getSecurityType(data.action),
      category: data.action,
      severity,
      title: `Security Alert: ${data.action}`,
      description: this.generateSecurityDescription(data),
      context: {
        ipAddress: data.ipAddress || '0.0.0.0',
        userAgent: data.userAgent || 'unknown',
        endpoint: data.endpoint,
        method: data.method,
      },
      riskScore,
      isSuspicious: data.isSuspicious || false,
      isBlocked: false,
      responseStatus: 'open',
      timestamp: new Date(),
    });
  }

  /**
   * Get security type from action
   */
  private getSecurityType(action: string): 'auth' | 'access' | 'data' | 'system' | 'compliance' {
    if (action.includes('auth') || action.includes('login') || action.includes('mfa')) {
      return 'auth';
    }
    if (action.includes('permission') || action.includes('role') || action.includes('access')) {
      return 'access';
    }
    if (action.includes('export') || action.includes('delete') || action.includes('data')) {
      return 'data';
    }
    if (action.includes('system') || action.includes('config')) {
      return 'system';
    }
    return 'compliance';
  }

  /**
   * Get severity from risk score
   */
  private getSeverityFromRisk(score: number): 'info' | 'warning' | 'error' | 'critical' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'error';
    if (score >= 40) return 'warning';
    return 'info';
  }

  /**
   * Generate security description
   */
  private generateSecurityDescription(data: LogData): string {
    let description = `Action: ${data.action}`;
    
    if (data.userId) description += `\nUser: ${data.userId}`;
    if (data.resource) description += `\nResource: ${data.resource}`;
    if (data.resourceId) description += `\nResource ID: ${data.resourceId}`;
    if (data.ipAddress) description += `\nIP Address: ${data.ipAddress}`;
    if (data.securityFlags && data.securityFlags.length > 0) {
      description += `\nFlags: ${data.securityFlags.join(', ')}`;
    }

    return description;
  }
}

const auditServiceInstance = new AuditService();
export default auditServiceInstance;
export { AuditService };
