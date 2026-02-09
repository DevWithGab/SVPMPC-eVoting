# i18n Installation & Usage Summary

## ✅ Installation Complete

i18n (internationalization) has been successfully installed and configured in your MERN_SVMPC application.

## What Was Installed

### Packages
- **i18next** - Core internationalization framework
- **react-i18next** - React bindings for i18next

```bash
npm install i18next react-i18next
```

## Project Structure

```
client/src/
├── i18n/
│   ├── config.ts          # i18n configuration
│   ├── en.json            # English translations
│   └── ph.json            # Filipino translations
├── components/
│   ├── Header.tsx         # ✅ Updated to use i18n
│   ├── Landing.tsx        # ✅ Updated to use i18n
│   └── ... (other components)
├── main.tsx               # ✅ Initialized i18n
├── App.tsx
└── types.ts
```

## How to Use

### 1. In Any Component

```tsx
import { useTranslation } from 'react-i18next';

export const MyComponent = () => {
  const { t, i18n } = useTranslation();

  return (
    <div>
      {/* Display translated text */}
      <h1>{t('common.homeButton')}</h1>
      
      {/* Change language */}
      <button onClick={() => i18n.changeLanguage('en')}>English</button>
      <button onClick={() => i18n.changeLanguage('ph')}>Filipino</button>
      
      {/* Get current language code */}
      <p>Current: {i18n.language}</p>
    </div>
  );
};
```

### 2. Translation Key Structure

Keys follow this pattern: `namespace.key`

Examples:
- `common.homeButton` → HOME / TAHANAN
- `landing.heroSubtitle` → Hero text in English / Filipino
- `admin.addCandidate` → Add Candidate / Magdagdag ng Kandidato

### 3. Supported Languages

| Language | Code | File |
|----------|------|------|
| English | `'en'` | `en.json` |
| Filipino/Tagalog | `'ph'` | `ph.json` |

## Available Translation Keys

### Common
- `common.homeButton`
- `common.rulesButton`
- `common.announcementsButton`
- `common.resourcesButton`
- `common.resultsButton`
- `common.adminButton`
- `common.loginButton`
- `common.logoutButton`
- `common.profileButton`
- `common.backButton`

### Landing Page
- `landing.heroSubtitle`
- `landing.voteButton`
- `landing.voteButtonLoggedIn`
- `landing.resultsButton`
- `landing.learnMore`

### Login
- `login.title`
- `login.email`
- `login.password`
- `login.signIn`
- `login.loginError`

### And more for voting, results, profile, rules, announcements, resources, and admin

See [I18N_GUIDE.md](./I18N_GUIDE.md) for complete documentation.

## Migrating Components to i18n

### Step 1: Import useTranslation
```tsx
import { useTranslation } from 'react-i18next';
```

### Step 2: Remove old TRANSLATIONS import
```tsx
// ❌ OLD
import { TRANSLATIONS } from '../constants';
const t = TRANSLATIONS[language];

// ✅ NEW
const { t } = useTranslation();
```

### Step 3: Update translation calls
```tsx
// ❌ OLD
<h1>{t.heroSubtitle}</h1>

// ✅ NEW
<h1>{t('landing.heroSubtitle')}</h1>
```

## Adding New Translations

1. Add to `src/i18n/en.json`:
```json
{
  "myFeature": {
    "buttonText": "Click Me"
  }
}
```

2. Add to `src/i18n/ph.json`:
```json
{
  "myFeature": {
    "buttonText": "I-click Ako"
  }
}
```

3. Use in component:
```tsx
const { t } = useTranslation();
<button>{t('myFeature.buttonText')}</button>
```

## Updated Components

The following components have been updated to use i18n:

✅ **Header.tsx**
- Navigation items now use i18n
- Language toggle uses i18n.changeLanguage()
- Responsive menu labels translated

✅ **Landing.tsx**
- Hero subtitle translated
- Vote button text translated
- Results button text translated

## Next Steps to Migrate

Other components that should be updated:

1. **Login.tsx** - Form labels and messages
2. **Voting.tsx** - Voting page text
3. **Results.tsx** - Results page text
4. **Profile.tsx** - Profile page text
5. **Admin.tsx** - Admin dashboard text
6. **Rules.tsx** - Rules page text
7. **Announcements.tsx** - Announcements page text
8. **Resources.tsx** - Resources page text

## Testing the Implementation

1. **Test Language Toggle**
   - Click the language toggle button in the header
   - Verify all text updates to the selected language

2. **Test with Browser Console**
   ```javascript
   // In browser console:
   i18next.changeLanguage('en')  // Switch to English
   i18next.changeLanguage('ph')  // Switch to Filipino
   ```

3. **Verify Translation Files**
   - Check `src/i18n/en.json` and `src/i18n/ph.json`
   - Ensure all keys have translations in both files

## Troubleshooting

### Translation key not found?
```
[i18next] key "common.unknownKey" for languages: en not found
```

**Solution:** Add the key to both `en.json` and `ph.json`

### Language not changing?
```tsx
// Make sure you're using i18n.changeLanguage()
const { i18n } = useTranslation();
i18n.changeLanguage('ph');  // ✅ Correct
```

### Component not re-rendering?
```tsx
// Make sure to import useTranslation in the component
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();  // ✅ Required
```

## Configuration File

Location: `src/i18n/config.ts`

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from './en.json';
import phTranslations from './ph.json';

// Configure with both languages
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      ph: { translation: phTranslations },
    },
    lng: 'en',        // Default language
    fallbackLng: 'en', // Fallback if key not found
  });
```

## Resources

- Full guide: [I18N_GUIDE.md](./I18N_GUIDE.md)
- i18next docs: https://www.i18next.com/
- react-i18next docs: https://react.i18next.com/

## Questions?

Refer to [I18N_GUIDE.md](./I18N_GUIDE.md) for comprehensive documentation on using i18n in your application.
