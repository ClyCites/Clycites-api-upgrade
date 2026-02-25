import { body } from 'express-validator';

const selfRegisterRoles = ['farmer', 'buyer', 'expert', 'trader'];
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

export const registerValidator = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 12 })
    .withMessage('Password must be at least 12 characters'),
  body('firstName')
    .trim()
    .notEmpty()
    .isLength({ max: 80 })
    .withMessage('First name is required'),
  body('lastName')
    .trim()
    .notEmpty()
    .isLength({ max: 80 })
    .withMessage('Last name is required'),
  body('phone')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number'),
  body('role')
    .optional()
    .isIn(selfRegisterRoles)
    .withMessage('Invalid role'),
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
  body('profileImage')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('profileImage is too long'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('bio is too long'),
  body('profile')
    .optional()
    .isObject()
    .withMessage('profile must be an object'),
  body('profile.displayName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('displayName must be between 1 and 120 characters'),
  body('profile.dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('profile.dateOfBirth must be a valid date'),
  body('profile.gender')
    .optional()
    .isIn(['male', 'female', 'non_binary', 'other', 'prefer_not_to_say'])
    .withMessage('Invalid profile.gender'),
  body('profile.address')
    .optional()
    .isObject()
    .withMessage('profile.address must be an object'),
  body('profile.address.line1').optional().trim().isLength({ max: 120 }),
  body('profile.address.line2').optional().trim().isLength({ max: 120 }),
  body('profile.address.city').optional().trim().isLength({ max: 80 }),
  body('profile.address.state').optional().trim().isLength({ max: 80 }),
  body('profile.address.district').optional().trim().isLength({ max: 80 }),
  body('profile.address.postalCode').optional().trim().isLength({ max: 20 }),
  body('profile.address.country').optional().trim().isLength({ max: 80 }),
  body('profile.identity')
    .optional()
    .isObject()
    .withMessage('profile.identity must be an object'),
  body('profile.identity.documentType')
    .optional()
    .isIn(documentTypes)
    .withMessage('Invalid profile.identity.documentType'),
  body('profile.identity.documentNumber').optional().trim().isLength({ max: 120 }),
  body('profile.identity.kycStatus')
    .optional()
    .isIn(kycStatuses)
    .withMessage('Invalid profile.identity.kycStatus'),
  body('profile.professional')
    .optional()
    .isObject()
    .withMessage('profile.professional must be an object'),
  body('profile.professional.company').optional().trim().isLength({ max: 120 }),
  body('profile.professional.jobTitle').optional().trim().isLength({ max: 120 }),
  body('profile.preferences')
    .optional()
    .isObject()
    .withMessage('profile.preferences must be an object'),
  body('profile.preferences.preferredContactMethod')
    .optional()
    .isIn(contactMethods)
    .withMessage('Invalid preferredContactMethod'),
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
  body('profile.compliance.privacyPolicyAccepted').optional().isBoolean().toBoolean(),
  body('profile.compliance.dataProcessingConsent').optional().isBoolean().toBoolean(),
  body('profile.compliance.gdprConsent').optional().isBoolean().toBoolean(),
];

export const loginValidator = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

export const verifyOTPValidator = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('code')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP code must be 6 digits'),
  body('purpose')
    .isIn(['verification', 'password_reset', 'login'])
    .withMessage('Invalid OTP purpose'),
];

export const resendOTPValidator = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('purpose')
    .isIn(['verification', 'password_reset', 'login'])
    .withMessage('Invalid OTP purpose'),
];

export const forgotPasswordValidator = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
];

export const resetPasswordValidator = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('code')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP code must be 6 digits'),
  body('newPassword')
    .isLength({ min: 12 })
    .withMessage('Password must be at least 12 characters'),
];

export const refreshTokenValidator = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
];

export const updateMyProfileValidator = [
  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .isLength({ max: 80 })
    .withMessage('firstName must be between 1 and 80 characters'),
  body('lastName')
    .optional()
    .trim()
    .notEmpty()
    .isLength({ max: 80 })
    .withMessage('lastName must be between 1 and 80 characters'),
  body('phone')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number'),
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
  body('profileImage')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('profileImage is too long'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('bio is too long'),
  body('profile')
    .optional()
    .isObject()
    .withMessage('profile must be an object'),
  body('profile.displayName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('displayName must be between 1 and 120 characters'),
  body('profile.dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('profile.dateOfBirth must be a valid date'),
  body('profile.gender')
    .optional()
    .isIn(['male', 'female', 'non_binary', 'other', 'prefer_not_to_say'])
    .withMessage('Invalid profile.gender'),
  body('profile.nationality').optional().trim().isLength({ max: 80 }),
  body('profile.maritalStatus')
    .optional()
    .isIn(['single', 'married', 'divorced', 'widowed', 'prefer_not_to_say'])
    .withMessage('Invalid profile.maritalStatus'),
  body('profile.preferredPronouns').optional().trim().isLength({ max: 40 }),
  body('profile.headline').optional().trim().isLength({ max: 180 }),
  body('profile.website').optional().isURL().withMessage('profile.website must be a valid URL'),
  body('profile.locale').optional().trim().isLength({ min: 2, max: 12 }),
  body('profile.currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('currency must be a 3-letter ISO code'),
  body('profile.address')
    .optional()
    .isObject()
    .withMessage('profile.address must be an object'),
  body('profile.address.line1').optional().trim().isLength({ max: 120 }),
  body('profile.address.line2').optional().trim().isLength({ max: 120 }),
  body('profile.address.city').optional().trim().isLength({ max: 80 }),
  body('profile.address.state').optional().trim().isLength({ max: 80 }),
  body('profile.address.district').optional().trim().isLength({ max: 80 }),
  body('profile.address.postalCode').optional().trim().isLength({ max: 20 }),
  body('profile.address.country').optional().trim().isLength({ max: 80 }),
  body('profile.billingAddress')
    .optional()
    .isObject()
    .withMessage('profile.billingAddress must be an object'),
  body('profile.billingAddress.line1').optional().trim().isLength({ max: 120 }),
  body('profile.billingAddress.line2').optional().trim().isLength({ max: 120 }),
  body('profile.billingAddress.city').optional().trim().isLength({ max: 80 }),
  body('profile.billingAddress.state').optional().trim().isLength({ max: 80 }),
  body('profile.billingAddress.district').optional().trim().isLength({ max: 80 }),
  body('profile.billingAddress.postalCode').optional().trim().isLength({ max: 20 }),
  body('profile.billingAddress.country').optional().trim().isLength({ max: 80 }),
  body('profile.identity')
    .optional()
    .isObject()
    .withMessage('profile.identity must be an object'),
  body('profile.identity.documentType')
    .optional()
    .isIn(documentTypes)
    .withMessage('Invalid profile.identity.documentType'),
  body('profile.identity.documentNumber').optional().trim().isLength({ max: 120 }),
  body('profile.identity.documentIssuingCountry').optional().trim().isLength({ max: 80 }),
  body('profile.identity.documentExpiryDate').optional().isISO8601(),
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
  body('profile.professional.skills').optional().isArray({ max: 50 }),
  body('profile.professional.skills.*').optional().trim().isLength({ max: 80 }),
  body('profile.professional.certifications').optional().isArray({ max: 50 }),
  body('profile.professional.certifications.*').optional().trim().isLength({ max: 120 }),
  body('profile.professional.linkedInUrl').optional().isURL(),
  body('profile.social')
    .optional()
    .isObject()
    .withMessage('profile.social must be an object'),
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
  body('profile.compliance.privacyPolicyAccepted').optional().isBoolean().toBoolean(),
  body('profile.compliance.dataProcessingConsent').optional().isBoolean().toBoolean(),
  body('profile.compliance.gdprConsent').optional().isBoolean().toBoolean(),
  body('profile.tags').optional().isArray({ max: 50 }),
  body('profile.tags.*').optional().trim().isLength({ max: 60 }),
  body('profile.customAttributes')
    .optional()
    .isObject()
    .withMessage('profile.customAttributes must be an object'),
  body('profile.customAttributes.*').optional().trim().isLength({ max: 200 }),
];

export const changePasswordValidator = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 12 })
    .withMessage('New password must be at least 12 characters')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),
];
