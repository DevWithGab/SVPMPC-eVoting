/**
 * Data Masking Service
 * Masks sensitive information in member lists while showing full details in detail views
 * Validates: Requirement 10.7
 */

/**
 * Mask email address - show only first character and domain
 * Example: john.doe@example.com -> j***@example.com
 */
function maskEmail(email) {
  if (!email) return null;
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return email;
  return `${localPart.charAt(0)}***@${domain}`;
}

/**
 * Mask phone number - show only last 4 digits
 * Example: +1-555-123-4567 -> ***-***-***-4567
 */
function maskPhoneNumber(phoneNumber) {
  if (!phoneNumber) return null;
  const lastFour = phoneNumber.slice(-4);
  const beforeLastFour = phoneNumber.slice(0, -4);
  // Replace all digits with *, keep other characters (like -, +, spaces)
  const masked = beforeLastFour.replace(/\d/g, '*');
  return `${masked}${lastFour}`;
}

/**
 * Mask member_id - show only first and last character
 * Example: MEM123456 -> M*******6
 */
function maskMemberId(memberId) {
  if (!memberId || memberId.length <= 2) return memberId;
  const first = memberId.charAt(0);
  const last = memberId.charAt(memberId.length - 1);
  const masked = '*'.repeat(memberId.length - 2);
  return `${first}${masked}${last}`;
}

/**
 * Apply masking to a member object for list display
 * Masks: email, phone_number, member_id
 */
function maskMemberForList(member) {
  return {
    ...member,
    email: maskEmail(member.email),
    phone_number: maskPhoneNumber(member.phone_number),
    member_id: maskMemberId(member.member_id),
  };
}

/**
 * Apply masking to an array of members for list display
 */
function maskMembersForList(members) {
  return members.map(maskMemberForList);
}

module.exports = {
  maskEmail,
  maskPhoneNumber,
  maskMemberId,
  maskMemberForList,
  maskMembersForList,
};
