# Translation Keys Reference

This document lists all available translation keys in the application, organized by feature/page.

## Structure

All translations are organized in JSON files with a namespace + key pattern:
```
namespace.key
```

## Complete Translation Key List

### Common (Navigation & Shared)
```
common.homeButton          → HOME / TAHANAN
common.rulesButton         → RULES / BATAS
common.announcementsButton → ANNOUNCEMENTS / ANUNSYO
common.resourcesButton     → RESOURCES / IMPORMASYON
common.resultsButton       → RESULTS / RESULTA
common.adminButton         → ADMIN / ADMIN
common.loginButton         → LOGIN / LOGON
common.logoutButton        → SIGN OUT / LUMABAS
common.profileButton       → PROFILE / PROFILE
common.backButton          → Back to Home / Bumalik sa Tahanan
```

### Landing Page
```
landing.heroSubtitle       → Main headline subtitle
landing.voteButton         → VOTE NOW / BUMOTO NGAYON
landing.voteButtonLoggedIn → CAST VOTE / MAGBOTO
landing.resultsButton      → VIEW RESULTS / TINGNAN ANG RESULTA
landing.learnMore          → Learn More / Matuto Nang Higit Pa
```

### Login Page
```
login.title        → Member Login / Pagpasok ng Miyembro
login.email        → Email Address
login.password     → Password / Katungkulan
login.signIn       → Sign In / Sumali
login.loginError   → Login error message
```

### Voting Page
```
voting.title           → Cast Your Vote / Ipalit ang Iyong Boto
voting.noElections     → No elections message
voting.selectCandidate → Select Candidate / Pumili ng Kandidato
voting.submitVote      → Submit Vote / Ipadala ang Boto
voting.voteConfirmed   → Success message
```

### Results Page
```
results.title      → Election Results / Resulta ng Halalan
results.noResults  → No results available message
results.turnout    → Voter Turnout / Pagsali ng Botante
results.candidates → Candidates / Mga Kandidato
results.votes      → Votes / Mga Boto
```

### Profile Page
```
profile.title              → Member Profile / Profile ng Miyembro
profile.information        → Membership Information / Impormasyon sa Pagiging Miyembro
profile.votingHistory      → Voting History / Kasaysayan ng Pagboto
profile.status             → Status / Status
profile.role               → Role / Papel
profile.username           → Username / Pangalan ng Gumagamit
profile.votingStatus       → Voting Status / Status ng Pagboto
profile.voted              → Voted / Bumoto Na
profile.pending            → Pending / Naghihintay
```

### Rules Page
```
rules.title    → Rules and Guidelines / Mga Panuntunan at Gabay
rules.noRules  → No rules available message
```

### Announcements Page
```
announcements.title            → Announcements / Mga Anunsyo
announcements.noAnnouncements  → No announcements message
```

### Resources Page
```
resources.title        → Resources / Mga Mapagkukunan
resources.noResources  → No resources available message
```

### Admin Dashboard
```
admin.title              → Admin Dashboard / Admin Dashboard
admin.overview           → Overview / Pangkalahatang Pananaw
admin.candidates         → Candidates / Mga Kandidato
admin.positions          → Positions / Mga Posisyon
admin.announcements      → Announcements / Mga Anunsyo
admin.rules              → Rules / Mga Panuntunan
admin.settings           → Settings / Mga Ayos
admin.users              → Users / Mga Gumagamit
admin.addCandidate       → Add Candidate / Magdagdag ng Kandidato
admin.addPosition        → Add Position / Magdagdag ng Posisyon
admin.addAnnouncement    → Add Announcement / Magdagdag ng Anunsyo
admin.addRule            → Add Rule / Magdagdag ng Panuntunan
admin.deleteConfirm      → Delete confirmation message
```

## How to Add New Keys

1. **Identify the namespace**: Where does this text belong?
   - `common` - Navigation/shared elements
   - `landing` - Landing page
   - `login` - Login page
   - `voting` - Voting page
   - `results` - Results page
   - `profile` - Profile page
   - `rules` - Rules page
   - `announcements` - Announcements page
   - `resources` - Resources page
   - `admin` - Admin dashboard

2. **Choose a descriptive key name**:
   - Use camelCase: `addCandidateButton`, `successMessage`
   - Be specific: `voteSubmissionSuccess`, not just `success`

3. **Add to both language files**:

   **src/i18n/en.json**:
   ```json
   {
     "voting": {
       "voteSubmissionSuccess": "Your vote has been recorded successfully"
     }
   }
   ```

   **src/i18n/ph.json**:
   ```json
   {
     "voting": {
       "voteSubmissionSuccess": "Ang iyong boto ay matagumpay na narekord"
     }
   }
   ```

4. **Use in component**:
   ```tsx
   const { t } = useTranslation();
   <p>{t('voting.voteSubmissionSuccess')}</p>
   ```

## Translation Categories

### High Priority (Commonly Used)
These are shown frequently and should be prioritized:
- Navigation buttons (common)
- Main page headings
- Form labels
- Action buttons
- Error messages

### Medium Priority
Less frequently seen but important:
- Page descriptions
- Help text
- Informational messages
- Success messages

### Low Priority
Rarely shown:
- Debug messages
- Placeholder text
- Tool tips (in some cases)

## Language Coverage

### Supported Languages
- **en** (English)
- **ph** (Filipino/Tagalog)

### To Add a New Language
1. Create `src/i18n/[langCode].json` with all keys
2. Import in `src/i18n/config.ts`
3. Add to resources object
4. Update language toggle in Header component

Example: Adding Spanish
```typescript
import esTranslations from './es.json';

const resources = {
  en: { translation: enTranslations },
  ph: { translation: phTranslations },
  es: { translation: esTranslations }, // ← Add new language
};
```

## Best Practices

### ✅ DO
- Use consistent naming: `addButton`, `deleteButton` (not `addBtn`, `removeBtn`)
- Keep translations in the right namespace
- Provide complete translations in all languages
- Use descriptive key names
- Group related translations together

### ❌ DON'T
- Hardcode text in components
- Mix namespaces (e.g., `admin.landing.text`)
- Use generic keys like `text`, `msg`, `label`
- Add HTML/React components in translation strings
- Forget to add keys to all language files

## Common Patterns

### Conditional Text
```tsx
const { t } = useTranslation();

// Use separate keys for different states
{isLoggedIn ? t('landing.voteButtonLoggedIn') : t('landing.voteButton')}
```

### Pluralization
For now, add separate keys:
```json
{
  "voting": {
    "oneVote": "1 vote",
    "multipleVotes": "{{count}} votes"
  }
}
```

### Dynamic Values
Use interpolation:
```json
{
  "profile": {
    "welcome": "Welcome, {{name}}!"
  }
}
```

```tsx
const { t } = useTranslation();
<p>{t('profile.welcome', { name: user.name })}</p>
```

## Verification Checklist

Before committing new translations:
- [ ] All keys exist in both `en.json` and `ph.json`
- [ ] Key names are descriptive and consistent
- [ ] Translations are accurate and complete
- [ ] No hardcoded text in components
- [ ] Component uses `t('namespace.key')` format
- [ ] Tested with both EN and PH languages

## File Locations
- English: `client/src/i18n/en.json`
- Filipino: `client/src/i18n/ph.json`
- Config: `client/src/i18n/config.ts`
