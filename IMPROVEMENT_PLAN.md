# Kinfolk CRM - Improvement Plan

**Date:** 2026-01-01
**Priority:** Collaboration + UI/UX Fixes

---

## 🎯 **User Requirements Summary**

### Core Use Case
**Collaborative CRM** for tracking family members:
- Single-player mode: One user tracks multiple family members
- Multi-player mode: Multiple users collaborate on ONE person's profile
  - Example: Both parents tracking their child
  - Example: Siblings + in-laws tracking elderly mother

### Collaboration Requirements
- When User A adds a todo/health record to a shared profile
- User B should see that update in their app **in real-time**
- All collaborators see the same data for the shared profile

---

## 🐛 **Known Issues to Fix** (Priority Order)

### **1. Ugly Default Avatars** ⭐ CRITICAL
**Current:** DiceBear avataaars (ugly cartoon figures)
**Needed:** Simple male/female icon placeholders

**Impact:** First impression, every new person added looks bad
**Effort:** Low (30 min)
**Files to change:**
- `App.tsx` - AddPersonModal avatar generation
- `components/Newsfeed.tsx` - Profile cards
- `types.ts` - Person interface defaults

**Implementation:**
```typescript
// Instead of:
avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`

// Use simple icons:
avatarUrl: 'https://ui-avatars.com/api/?name=Male&background=3B82F6&color=fff' // Blue for male
avatarUrl: 'https://ui-avatars.com/api/?name=Female&background=EC4899&color=fff' // Pink for female
// Or use local SVG assets
```

---

### **2. Email Should Be Mandatory** ⭐ CRITICAL
**Current:** Email is optional for both signup and adding people
**Needed:** Email required for signup AND adding people

**Why:**
- Email is the primary identifier for collaboration
- Merging profiles requires unique keys
- Sending collaboration requests needs email

**Effort:** Low (30 min)
**Files to change:**
- `App.tsx` - LoginScreen (already required, just verify)
- `App.tsx` - AddPersonModal (make email required)
- `types.ts` - Update Person interface (remove optional)

**Changes:**
```typescript
// AddPersonModal
<Input
  label="Email"
  type="email"
  value={email}
  onChange={e => setEmail(e.target.value)}
  placeholder="email@example.com"
  required // Add this
/>

// Validation in handleSubmit
if (name && relation && email) { // Add email check
  // proceed
}
```

---

### **3. Add Phone Number & Date of Birth Fields** ⭐ CRITICAL
**Current:** Only name, relation, birthday (optional), email (optional)
**Needed:** Phone number + DOB as merge keys

**Why:**
- Multiple merge keys improve accuracy
- When User A adds "Mom" and User B adds "Mother" with same email/phone/DOB → can auto-merge
- Better profile completeness

**Effort:** Medium (1-2 hours)
**Files to change:**
- `types.ts` - Add phone, dateOfBirth to Person interface
- `App.tsx` - AddPersonModal (add fields)
- `components/PersonDetail.tsx` - Display phone/DOB in profile tab
- Supabase migration - Add columns to people table

**Database Schema Update:**
```sql
ALTER TABLE people
ADD COLUMN phone VARCHAR(20),
ADD COLUMN date_of_birth DATE;
```

**Form Changes:**
```typescript
const [phone, setPhone] = useState('');
const [dateOfBirth, setDateOfBirth] = useState('');

<Input label="Phone Number" type="tel" value={phone} onChange={e => setPhone(e.target.value)} required />
<Input label="Date of Birth" type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} required />
```

---

### **4. Clean Up Collaboration Modal UI** ⭐ HIGH PRIORITY
**Current Issues:**
- Confusing UI with multiple buttons (+ button, manage button)
- Not clear what each button does
- Too many steps to invite someone

**Needed:**
- Simplified, intuitive UI
- Clear primary action: "Invite Collaborator"
- Secondary action: "Manage Collaborators"
- Better visual hierarchy

**Effort:** Medium (1-2 hours)
**Files to change:**
- `components/ShareComponents.tsx` - Redesign modal
- `components/PersonDetail.tsx` - Update button layout

**Proposed UI:**
```
┌─────────────────────────────────────┐
│  Collaborators (2)                  │
│  ─────────────────────────────────  │
│  👤 John Doe (john@email.com)   ✕   │
│  👤 Jane Doe (jane@email.com)   ✕   │
│  ─────────────────────────────────  │
│  [+ Invite New Collaborator]        │
└─────────────────────────────────────┘
```

---

### **5. Add Self-Profile Feature** ⭐ HIGH PRIORITY
**Current:** Can't add items for yourself
**Needed:** Ability to create a "Me" profile and track own health/todos/etc.

**Why:**
- Users want to track their own health records
- Users want personal todos
- Family members can collaborate on YOUR profile too

**Effort:** Medium (2-3 hours)
**Implementation:**

**Option A: Auto-create "Me" profile on signup**
```typescript
// In AuthProvider after signup
const createSelfProfile = async (user) => {
  await addPerson(
    user.user_metadata.full_name || 'Me',
    'Self',
    '', // birthday can be added later
    undefined, // file
    user.email
  );
};
```

**Option B: Add "Create My Profile" button in app**
- Show prompt on first login
- "Would you like to create a profile for yourself?"
- Pre-fill name and email from account

**Files to change:**
- `App.tsx` - Auto-create or prompt
- `components/Newsfeed.tsx` - Show "Me" profile at top
- `src/hooks/usePeople.ts` - Mark one profile as self

---

### **6. Identify Non-Working/Redundant Buttons** ⭐ MEDIUM
**Task:** Audit entire app for broken/redundant UI elements

**Areas to check:**
- [ ] All buttons in PersonDetail tabs
- [ ] Share modal buttons
- [ ] Newsfeed action buttons
- [ ] ChatBot interface
- [ ] Collaboration requests

**Effort:** Medium (1-2 hours - requires manual testing)

---

### **7. Improve Profile Merge Logic** ⭐ HIGH PRIORITY
**Current:** Manual merge process
**Needed:** Smart auto-merge suggestions based on:
- Email match (primary key)
- Phone match (secondary key)
- DOB match (tertiary key)
- Name similarity (fuzzy match)

**Example:**
```
User A adds: "Mom" (email: mary@email.com, phone: 555-1234)
User B adds: "Mother" (email: mary@email.com, phone: 555-1234)

→ Auto-detect: "These profiles might be the same person. Merge?"
```

**Effort:** High (3-4 hours)
**Files to change:**
- `src/hooks/usePeople.ts` - Add merge detection logic
- `components/Newsfeed.tsx` - Show merge suggestions
- Create new component: `MergeSuggestionCard.tsx`

**Algorithm:**
```typescript
const detectMergeableProfiles = (profiles) => {
  const suggestions = [];

  profiles.forEach((profileA, i) => {
    profiles.slice(i + 1).forEach(profileB => {
      let matchScore = 0;

      // Email match = 100 points
      if (profileA.email === profileB.email) matchScore += 100;

      // Phone match = 80 points
      if (profileA.phone === profileB.phone) matchScore += 80;

      // DOB match = 60 points
      if (profileA.dateOfBirth === profileB.dateOfBirth) matchScore += 60;

      // Name similarity = 0-40 points
      const nameSimilarity = calculateSimilarity(profileA.name, profileB.name);
      matchScore += nameSimilarity * 40;

      // If score > 100, suggest merge
      if (matchScore > 100) {
        suggestions.push({ profileA, profileB, matchScore });
      }
    });
  });

  return suggestions;
};
```

---

### **8. Real-Time Sync for Collaborators** ⭐ CRITICAL
**Current:** May not update in real-time (need to verify)
**Needed:** When User A adds todo, User B sees it immediately

**Supabase Real-time Setup:**
```typescript
// In usePeople.ts
useEffect(() => {
  const subscription = supabase
    .channel('people_changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'todos' },
      (payload) => {
        // Update local state when remote changes
        handleRemoteChange(payload);
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

**Effort:** Medium (2-3 hours)
**Files to change:**
- `src/hooks/usePeople.ts` - Add Supabase real-time subscriptions
- Subscribe to: people, todos, health_records, financial_records, notes

---

### **9. UI/UX Improvements** ⭐ MEDIUM
**General polish:**
- [ ] Consistent button styles
- [ ] Better error messages
- [ ] Loading states for all async operations
- [ ] Empty states ("No todos yet - add one!")
- [ ] Success/failure toasts
- [ ] Better form validation feedback

**Effort:** Medium (2-3 hours)

---

### **10. Testing Infrastructure** ⭐ LOW (do last)
**Setup:**
- Jest + React Testing Library
- Playwright for E2E
- Test collaboration workflows

**Effort:** High (4-6 hours)

---

## 📅 **Implementation Timeline**

### **Phase 1: Quick Wins** (3-4 hours)
✅ Fix default avatars
✅ Make email mandatory
✅ Add phone & DOB fields
✅ Clean up collaboration modal

### **Phase 2: Core Features** (4-5 hours)
✅ Add self-profile feature
✅ Improve merge logic
✅ Add real-time sync

### **Phase 3: Polish** (3-4 hours)
✅ Fix non-working buttons
✅ UI/UX improvements
✅ Error handling

### **Phase 4: Testing** (4-6 hours)
✅ Set up testing
✅ Write tests for collaboration
✅ E2E test suite

**Total Estimated Time:** 14-19 hours

---

## 🚀 **Let's Start!**

**Recommended Order:**
1. Fix avatars (immediate visual improvement)
2. Make email mandatory + add phone/DOB (data integrity)
3. Clean up collaboration modal (UX improvement)
4. Add self-profile (new feature users want)
5. Real-time sync (critical for collaboration)
6. Merge logic (quality of life)
7. UI polish
8. Testing

---

**Ready to begin?** Say "yes" and I'll start with #1 (fixing the ugly avatars)!
