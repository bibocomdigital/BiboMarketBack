export const calculateProfileCompletion = (user: {
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  country?: string | null;
  city?: string | null;
  photo?: string | null;
}): number => {
  const fields = [
    'firstName',
    'lastName',
    'phoneNumber',
    'country',
    'city',
    'photo',
  ] as const;

  const completedFields = fields.filter((field) => {
    const value = user[field];
    return value && value.toString().trim() !== '';
  }).length;

  return Math.round((completedFields / fields.length) * 100);
};

export const getNextOnboardingStep = (user: {
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  country?: string | null;
  city?: string | null;
  photo?: string | null;
}): string => {
  if (!user.firstName || !user.lastName) return 'personal_info';
  if (!user.phoneNumber) return 'contact_info';
  if (!user.country || !user.city) return 'address_info';
  if (!user.photo) return 'profile_photo';
  return 'completed';
};

export const determineOnboardingStep = getNextOnboardingStep;
