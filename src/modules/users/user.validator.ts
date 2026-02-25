import { body, param, query } from 'express-validator';

const userRoles = ['platform_admin', 'admin', 'farmer', 'buyer', 'expert', 'trader'];
const contactMethods = ['email', 'phone', 'sms', 'whatsapp', 'in_app'];
const kycStatuses = ['not_started', 'pending', 'verified', 'rejected', 'expired'];
const documentTypes = [
  'national_id',
  'passport',
  'driver_license',
  'voter_card',
  'business_registration',
  'other',
];

const adminSortableFields = [
  'createdAt',
  'updatedAt',
  'lastLogin',
  'email',
  'firstName',
  'lastName',
  'role',
  'isActive',
  'loginCount',
  'profile.completionScore',
];

export const adminListUsersValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('Search must be between 1 and 120 characters'),
  query('role').optional().isIn(userRoles).withMessage('Invalid role'),
  query('isActive').optional().isBoolean().withMessage('isActive must be boolean').toBoolean(),
  query('isEmailVerified')
    .optional()
    .isBoolean()
    .withMessage('isEmailVerified must be boolean')
    .toBoolean(),
  query('requiresIdentityVerification')
    .optional()
    .isBoolean()
    .withMessage('requiresIdentityVerification must be boolean')
    .toBoolean(),
  query('includeDeleted')
    .optional()
    .isBoolean()
    .withMessage('includeDeleted must be boolean')
    .toBoolean(),
  query('sortBy').optional().isIn(adminSortableFields).withMessage('Invalid sortBy field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('sortOrder must be asc or desc'),
];

export const adminUserIdValidator = [
  param('id').isMongoId().withMessage('Invalid user ID'),
];

export const adminUpdateUserValidator = [
  ...adminUserIdValidator,
  body('email').optional().isEmail().withMessage('Invalid email').normalizeEmail(),
  body('phone')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Invalid phone number'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 80 })
    .withMessage('First name must be between 1 and 80 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 80 })
    .withMessage('Last name must be between 1 and 80 characters'),
  body('role').optional().isIn(userRoles).withMessage('Invalid role'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean').toBoolean(),
  body('isEmailVerified')
    .optional()
    .isBoolean()
    .withMessage('isEmailVerified must be boolean')
    .toBoolean(),
  body('isPhoneVerified')
    .optional()
    .isBoolean()
    .withMessage('isPhoneVerified must be boolean')
    .toBoolean(),
  body('isMfaEnabled')
    .optional()
    .isBoolean()
    .withMessage('isMfaEnabled must be boolean')
    .toBoolean(),
  body('passwordResetRequired')
    .optional()
    .isBoolean()
    .withMessage('passwordResetRequired must be boolean')
    .toBoolean(),
  body('requiresIdentityVerification')
    .optional()
    .isBoolean()
    .withMessage('requiresIdentityVerification must be boolean')
    .toBoolean(),
  body('suspiciousActivityDetected')
    .optional()
    .isBoolean()
    .withMessage('suspiciousActivityDetected must be boolean')
    .toBoolean(),
  body('profileImage')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('profileImage is too long'),
  body('bio').optional().trim().isLength({ max: 2000 }).withMessage('bio is too long'),
  body('timezone')
    .optional()
    .trim()
    .isLength({ min: 2, max: 64 })
    .withMessage('timezone must be between 2 and 64 characters'),
  body('language')
    .optional()
    .trim()
    .isLength({ min: 2, max: 8 })
    .withMessage('language must be between 2 and 8 characters'),
  body('profile').optional().isObject().withMessage('profile must be an object'),
  body('profile.displayName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('displayName must be between 1 and 120 characters'),
  body('profile.middleName')
    .optional()
    .trim()
    .isLength({ max: 80 })
    .withMessage('middleName is too long'),
  body('profile.dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('profile.dateOfBirth must be a valid date'),
  body('profile.gender')
    .optional()
    .isIn(['male', 'female', 'non_binary', 'other', 'prefer_not_to_say'])
    .withMessage('Invalid profile.gender'),
  body('profile.nationality')
    .optional()
    .trim()
    .isLength({ max: 80 })
    .withMessage('nationality is too long'),
  body('profile.maritalStatus')
    .optional()
    .isIn(['single', 'married', 'divorced', 'widowed', 'prefer_not_to_say'])
    .withMessage('Invalid profile.maritalStatus'),
  body('profile.preferredPronouns')
    .optional()
    .trim()
    .isLength({ max: 40 })
    .withMessage('preferredPronouns is too long'),
  body('profile.headline')
    .optional()
    .trim()
    .isLength({ max: 180 })
    .withMessage('headline is too long'),
  body('profile.website').optional().isURL().withMessage('profile.website must be a valid URL'),
  body('profile.locale')
    .optional()
    .trim()
    .isLength({ min: 2, max: 12 })
    .withMessage('locale must be between 2 and 12 characters'),
  body('profile.currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('currency must be a 3-letter ISO code'),

  body('profile.address').optional().isObject().withMessage('profile.address must be an object'),
  body('profile.address.line1').optional().trim().isLength({ max: 120 }),
  body('profile.address.line2').optional().trim().isLength({ max: 120 }),
  body('profile.address.city').optional().trim().isLength({ max: 80 }),
  body('profile.address.state').optional().trim().isLength({ max: 80 }),
  body('profile.address.district').optional().trim().isLength({ max: 80 }),
  body('profile.address.postalCode').optional().trim().isLength({ max: 20 }),
  body('profile.address.country').optional().trim().isLength({ max: 80 }),

  body('profile.billingAddress').optional().isObject().withMessage('profile.billingAddress must be an object'),
  body('profile.billingAddress.line1').optional().trim().isLength({ max: 120 }),
  body('profile.billingAddress.line2').optional().trim().isLength({ max: 120 }),
  body('profile.billingAddress.city').optional().trim().isLength({ max: 80 }),
  body('profile.billingAddress.state').optional().trim().isLength({ max: 80 }),
  body('profile.billingAddress.district').optional().trim().isLength({ max: 80 }),
  body('profile.billingAddress.postalCode').optional().trim().isLength({ max: 20 }),
  body('profile.billingAddress.country').optional().trim().isLength({ max: 80 }),

  body('profile.identity').optional().isObject().withMessage('profile.identity must be an object'),
  body('profile.identity.documentType')
    .optional()
    .isIn(documentTypes)
    .withMessage('Invalid profile.identity.documentType'),
  body('profile.identity.documentNumber').optional().trim().isLength({ max: 120 }),
  body('profile.identity.documentIssuingCountry').optional().trim().isLength({ max: 80 }),
  body('profile.identity.documentExpiryDate')
    .optional()
    .isISO8601()
    .withMessage('profile.identity.documentExpiryDate must be a valid date'),
  body('profile.identity.kycStatus')
    .optional()
    .isIn(kycStatuses)
    .withMessage('Invalid profile.identity.kycStatus'),
  body('profile.identity.kycReference').optional().trim().isLength({ max: 120 }),
  body('profile.identity.verificationProvider').optional().trim().isLength({ max: 80 }),
  body('profile.identity.rejectionReason').optional().trim().isLength({ max: 500 }),

  body('profile.professional')
    .optional()
    .isObject()
    .withMessage('profile.professional must be an object'),
  body('profile.professional.company').optional().trim().isLength({ max: 120 }),
  body('profile.professional.jobTitle').optional().trim().isLength({ max: 120 }),
  body('profile.professional.department').optional().trim().isLength({ max: 120 }),
  body('profile.professional.employeeId').optional().trim().isLength({ max: 80 }),
  body('profile.professional.industry').optional().trim().isLength({ max: 80 }),
  body('profile.professional.yearsOfExperience')
    .optional()
    .isInt({ min: 0, max: 80 })
    .withMessage('yearsOfExperience must be between 0 and 80'),
  body('profile.professional.skills')
    .optional()
    .isArray({ max: 50 })
    .withMessage('skills must be an array with up to 50 items'),
  body('profile.professional.skills.*').optional().trim().isLength({ max: 80 }),
  body('profile.professional.certifications')
    .optional()
    .isArray({ max: 50 })
    .withMessage('certifications must be an array with up to 50 items'),
  body('profile.professional.certifications.*').optional().trim().isLength({ max: 120 }),
  body('profile.professional.linkedInUrl')
    .optional()
    .isURL()
    .withMessage('profile.professional.linkedInUrl must be a valid URL'),

  body('profile.social').optional().isObject().withMessage('profile.social must be an object'),
  body('profile.social.website').optional().isURL(),
  body('profile.social.x').optional().isURL(),
  body('profile.social.linkedIn').optional().isURL(),
  body('profile.social.facebook').optional().isURL(),
  body('profile.social.instagram').optional().isURL(),

  body('profile.emergencyContact')
    .optional()
    .isObject()
    .withMessage('profile.emergencyContact must be an object'),
  body('profile.emergencyContact.name').optional().trim().isLength({ max: 120 }),
  body('profile.emergencyContact.relationship').optional().trim().isLength({ max: 80 }),
  body('profile.emergencyContact.phone')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Invalid emergency contact phone'),
  body('profile.emergencyContact.email').optional().isEmail(),

  body('profile.preferences')
    .optional()
    .isObject()
    .withMessage('profile.preferences must be an object'),
  body('profile.preferences.preferredContactMethod')
    .optional()
    .isIn(contactMethods)
    .withMessage('Invalid preferredContactMethod'),
  body('profile.preferences.dateFormat')
    .optional()
    .isIn(['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'])
    .withMessage('Invalid dateFormat'),
  body('profile.preferences.timeFormat')
    .optional()
    .isIn(['12h', '24h'])
    .withMessage('Invalid timeFormat'),
  body('profile.preferences.numberFormat')
    .optional()
    .isIn(['1,234.56', '1.234,56'])
    .withMessage('Invalid numberFormat'),
  body('profile.preferences.weekStartsOn')
    .optional()
    .isIn([0, 1, 6])
    .withMessage('weekStartsOn must be 0, 1, or 6'),
  body('profile.preferences.marketingOptIn').optional().isBoolean().toBoolean(),
  body('profile.preferences.notifications')
    .optional()
    .isObject()
    .withMessage('profile.preferences.notifications must be an object'),
  body('profile.preferences.notifications.email').optional().isBoolean().toBoolean(),
  body('profile.preferences.notifications.sms').optional().isBoolean().toBoolean(),
  body('profile.preferences.notifications.push').optional().isBoolean().toBoolean(),
  body('profile.preferences.notifications.inApp').optional().isBoolean().toBoolean(),
  body('profile.preferences.notifications.whatsapp').optional().isBoolean().toBoolean(),
  body('profile.preferences.notifications.securityAlerts').optional().isBoolean().toBoolean(),

  body('profile.compliance')
    .optional()
    .isObject()
    .withMessage('profile.compliance must be an object'),
  body('profile.compliance.termsAccepted').optional().isBoolean().toBoolean(),
  body('profile.compliance.termsAcceptedAt').optional().isISO8601(),
  body('profile.compliance.privacyPolicyAccepted').optional().isBoolean().toBoolean(),
  body('profile.compliance.privacyPolicyAcceptedAt').optional().isISO8601(),
  body('profile.compliance.dataProcessingConsent').optional().isBoolean().toBoolean(),
  body('profile.compliance.dataProcessingConsentAt').optional().isISO8601(),
  body('profile.compliance.gdprConsent').optional().isBoolean().toBoolean(),
  body('profile.compliance.gdprConsentAt').optional().isISO8601(),

  body('profile.tags')
    .optional()
    .isArray({ max: 50 })
    .withMessage('profile.tags must be an array with up to 50 items'),
  body('profile.tags.*').optional().trim().isLength({ max: 60 }),
  body('profile.customAttributes')
    .optional()
    .isObject()
    .withMessage('profile.customAttributes must be an object'),
  body('profile.customAttributes.*').optional().trim().isLength({ max: 200 }),
];

export const adminUpdateUserStatusValidator = [
  ...adminUserIdValidator,
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean').toBoolean(),
  body('lockUntilHours')
    .optional()
    .isInt({ min: 0, max: 720 })
    .withMessage('lockUntilHours must be between 0 and 720')
    .toInt(),
  body('requiresIdentityVerification')
    .optional()
    .isBoolean()
    .withMessage('requiresIdentityVerification must be boolean')
    .toBoolean(),
  body('suspiciousActivityDetected')
    .optional()
    .isBoolean()
    .withMessage('suspiciousActivityDetected must be boolean')
    .toBoolean(),
  body('passwordResetRequired')
    .optional()
    .isBoolean()
    .withMessage('passwordResetRequired must be boolean')
    .toBoolean(),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('reason must not exceed 300 characters'),
];

export const adminDeleteUserValidator = [
  ...adminUserIdValidator,
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('reason must not exceed 300 characters'),
];
