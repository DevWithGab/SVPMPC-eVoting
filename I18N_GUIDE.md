# i18n Integration Guide

## Overview
This project uses **i18next** and **react-i18next** for internationalization (i18n). The application supports English (EN) and Filipino/Tagalog (PH) languages.

## Setup

### Installation
```bash
npm install i18next react-i18next
```

### Configuration
The i18n configuration is located in `src/i18n/config.ts` and is initialized in `src/main.tsx`.

### Translation Files
Translation files are in JSON format located in `src/i18n/`:
- `en.json` - English translations
- `ph.json` - Filipino/Tagalog translations

## Using i18n in Components

### Basic Usage with useTranslation Hook

```tsx
import { useTranslation } from 'react-i18next';

export const MyComponent: React.FC = () => {
  const { t, i18n } = useTranslation();

  return (
    <div>
      <h1>{t('common.homeButton')}</h1>
      <p>{t('landing.heroSubtitle')}</p>
      
      {/* Change language */}
      <button onClick={() => i18n.changeLanguage('en')}>
        English
      </button>
      <button onClick={() => i18n.changeLanguage('ph')}>
        Filipino
      </button>
      
      {/* Get current language */}
      <p>Current language: {i18n.language}</p>
    </div>
  );
};
```

## Translation Structure

### Organization by Namespace
Translations are organized by feature/page:

```json
{
  "common": {
    "homeButton": "HOME",
    "rulesButton": "RULES",
    ...
  },
  "landing": {
    "heroSubtitle": "...",
    "voteButton": "VOTE NOW",
    ...
  },
  "login": {
    "title": "Member Login",
    ...
  },
  "voting": {
    "title": "Cast Your Vote",
    ...
  }
}
```

## Examples

### Example 1: Simple Text Translation
```tsx
const { t } = useTranslation();

return <h1>{t('landing.title')}</h1>;
```

### Example 2: Language Toggle
```tsx
const { i18n } = useTranslation();

const handleLanguageChange = (lang: 'EN' | 'PH') => {
  const langCode = lang === 'EN' ? 'en' : 'ph';
  i18n.changeLanguage(langCode);
};
```

### Example 3: Conditional Translation Based on Language
```tsx
const { t, i18n } = useTranslation();

return (
  <p>
    {i18n.language === 'en' 
      ? 'Welcome to our voting system' 
      : 'Maligayang pagdating sa aming sistema ng pagboto'}
  </p>
);

// OR Better: Use translation keys
<p>{t('landing.welcome')}</p>
```

### Example 4: Using in Header Component
```tsx
import { useTranslation } from 'react-i18next';

export const Header: React.FC = () => {
  const { t, i18n } = useTranslation();

  const navItems = [
    { label: t('common.homeButton'), value: 'LANDING' },
    { label: t('common.rulesButton'), value: 'RULES' },
    { label: t('common.announcementsButton'), value: 'ANNOUNCEMENTS' },
  ];

  return (
    <header>
      <nav>
        {navItems.map(item => (
          <button key={item.value}>{item.label}</button>
        ))}
      </nav>
    </header>
  );
};
```

## Adding New Translations

1. **Identify the translation key**: Decide on the namespace and key
   - Format: `namespace.key` (e.g., `admin.addCandidate`)

2. **Add to both language files**:
   
   `src/i18n/en.json`:
   ```json
   {
     "admin": {
       "addCandidate": "Add Candidate"
     }
   }
   ```

   `src/i18n/ph.json`:
   ```json
   {
     "admin": {
       "addCandidate": "Magdagdag ng Kandidato"
     }
   }
   ```

3. **Use in component**:
   ```tsx
   const { t } = useTranslation();
   <button>{t('admin.addCandidate')}</button>
   ```

## Current Language Code Mapping

| Display | i18n Code | Translation File |
|---------|-----------|------------------|
| EN      | `'en'`    | `en.json`        |
| PH      | `'ph'`    | `ph.json`        |

## Available Translation Namespaces

- **common** - Navigation and shared elements
- **landing** - Landing page
- **login** - Login page
- **voting** - Voting page
- **results** - Results page
- **profile** - Profile page
- **rules** - Rules page
- **announcements** - Announcements page
- **resources** - Resources page
- **admin** - Admin dashboard

## Debugging

### Check Current Language
```tsx
const { i18n } = useTranslation();
console.log('Current language:', i18n.language);
```

### Check Translation Loading
Open browser console and look for any i18n warnings or errors.

### Force Language Change
```tsx
const { i18n } = useTranslation();
i18n.changeLanguage('en'); // Force English
i18n.changeLanguage('ph'); // Force Filipino
```

## Best Practices

1. **Always use translation keys** - Don't hardcode strings
2. **Group related translations** - Use logical namespaces
3. **Keep translations organized** - Alphabetize keys within namespaces
4. **Use descriptive key names** - Make keys self-documenting
5. **Provide complete translations** - Ensure all keys exist in all language files
6. **Test both languages** - Always verify translations work in both EN and PH

## Migration from Old TRANSLATIONS Constant

The old `TRANSLATIONS` constant in `constants.tsx` has been replaced with i18n. All components should use:

```tsx
// OLD (deprecated)
import { TRANSLATIONS } from '../constants';
const text = TRANSLATIONS[language].heroSubtitle;

// NEW (correct)
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
const text = t('landing.heroSubtitle');
```

## Persistence

Currently, the language preference is NOT persisted to localStorage. To add persistence:

```tsx
// In i18n/config.ts
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('preferredLanguage', lng);
});

// Load saved preference
const savedLng = localStorage.getItem('preferredLanguage') || 'en';
i18n.changeLanguage(savedLng);
```
