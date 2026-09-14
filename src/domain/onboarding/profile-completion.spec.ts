import { calculateProfileCompletion, getNextOnboardingStep } from './profile-completion';

describe('profile-completion', () => {
  it('calcule 0% si aucun champ', () => {
    expect(calculateProfileCompletion({})).toBe(0);
  });

  it('calcule 100% si tous les champs sont remplis', () => {
    expect(
      calculateProfileCompletion({
        firstName: 'Awa',
        lastName: 'Diop',
        phoneNumber: '+221770000000',
        country: 'SN',
        city: 'Dakar',
        photo: 'https://cdn/photo.jpg',
      }),
    ).toBe(100);
  });

  it('oriente vers personal_info si le nom manque', () => {
    expect(getNextOnboardingStep({ phoneNumber: '+221770000000' })).toBe(
      'personal_info',
    );
  });
});
