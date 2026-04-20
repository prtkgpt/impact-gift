# Application Testing Checklist

Test the application thoroughly using this checklist. Check off each item as you test.

## 🌐 **Pre-Testing Setup**

- [ ] Clear browser cache and cookies
- [ ] Test in Chrome/Firefox/Safari
- [ ] Test on mobile device (or Chrome DevTools mobile view)
- [ ] Check console for errors (F12 → Console tab)

---

## 1️⃣ **Public Pages (No Login Required)**

### Landing Page (/)
- [ ] Page loads without errors
- [ ] Hero section displays correctly
- [ ] Call-to-action buttons work
- [ ] Navigation menu visible
- [ ] Mobile: Hamburger menu appears and works
- [ ] All text readable (good contrast)
- [ ] Images load properly

### Event Page (Public)
- [ ] Visit a test event: `/event/YOUR-EVENT-SLUG`
- [ ] Event details display correctly (title, date, time in 12-hour format)
- [ ] Event image loads (if set)
- [ ] Charity cards display
- [ ] **NEW:** Donation amount input has no up/down arrows
- [ ] **NEW:** Donation amount input is large and readable
- [ ] **NEW:** Time shows as "6:27 PM" not "18:27:00"
- [ ] Location/venue displays correctly
- [ ] RSVP form is visible
- [ ] Countdown timer works (if event is upcoming)

---

## 2️⃣ **Authentication Flow**

### Sign Up
- [ ] Navigate to `/signup`
- [ ] Form displays correctly
- [ ] Fill out all required fields
- [ ] Submit form
- [ ] Success: Redirects to dashboard
- [ ] Error handling: Shows error messages for invalid input
- [ ] Email validation works

### Login
- [ ] Navigate to `/login`
- [ ] Form displays correctly
- [ ] Login with test credentials
- [ ] Success: Redirects to dashboard
- [ ] Error: Shows "Invalid credentials" message
- [ ] "Remember me" works (if applicable)

### Forgot Password
- [ ] Click "Forgot Password" link
- [ ] Enter email address
- [ ] Success message appears
- [ ] Check email for reset link (if email is configured)

### Logout
- [ ] Click logout button
- [ ] Redirects to home page
- [ ] Cannot access protected pages anymore

---

## 3️⃣ **Dashboard (Authenticated User)**

### Initial Load
- [ ] Dashboard loads (check loading time - should be fast with keep-alive)
- [ ] **Stats cards display** (commitments made/received)
- [ ] "My Events" section shows user's events
- [ ] "My Invitations" section shows invitations
- [ ] Empty states show appropriate messages
- [ ] **NEW:** No emoji icons visible (should be SVG icons)
- [ ] **NEW:** Clean, modern Airbnb-style design
- [ ] **NEW:** Mobile: All cards stack properly

### My Events Section
- [ ] Events display in cards
- [ ] Event stats show (total raised, RSVPs)
- [ ] "Manage" button works
- [ ] "View Page" button opens event in new context
- [ ] "Create Event" button visible and works

### Invitations Section
- [ ] Invitations display in cards
- [ ] RSVP status badges show correctly
- [ ] **NEW:** Time displays in 12-hour format (e.g., "6:00 PM")
- [ ] "View Event" button works

---

## 4️⃣ **Create Event**

### Basic Event Creation
- [ ] Navigate to `/create-event`
- [ ] Form displays all fields
- [ ] Fill in required fields:
  - [ ] Event title
  - [ ] Event date
  - [ ] Event type (in-person/virtual/hybrid)
- [ ] Select charities (optional)
- [ ] Upload event image (optional)
- [ ] Set goal amount (optional)
- [ ] Submit form
- [ ] Success: Redirects to manage event page
- [ ] Event appears in dashboard

### Form Validation
- [ ] Required fields show errors if empty
- [ ] Date cannot be in the past
- [ ] Amount fields only accept numbers
- [ ] **NEW:** Time inputs show properly formatted

---

## 5️⃣ **Manage Event**

### Page Load
- [ ] Navigate to event manage page
- [ ] Event details load
- [ ] Tabs display correctly
- [ ] **NEW:** Tabs scroll horizontally on mobile (no overflow)
- [ ] **NEW:** Header buttons have SVG icons (not emojis)
- [ ] Stats cards show correct numbers

### Tabs Navigation
- [ ] **Event Details** tab works
- [ ] **Charities** tab works
- [ ] **Guest List** tab works
- [ ] **RSVP Summary** tab works
- [ ] **Message Guests** tab works
- [ ] **Co-Hosts** tab works
- [ ] **Potluck** tab works (if applicable)
- [ ] **Progress & Donations** tab works
- [ ] **NEW:** Tabs scrollable on mobile without breaking layout

### Event Details Tab
- [ ] Can edit event title
- [ ] Can edit event description
- [ ] Can change event date/time
- [ ] Can upload/change event image
- [ ] Can update location/venue
- [ ] Save changes works
- [ ] Changes persist after refresh

### Guest List Tab
- [ ] Can add guest manually (name + email)
- [ ] Can bulk import CSV
- [ ] Guest list displays in table
- [ ] **NEW:** Table converts to cards on mobile
- [ ] Can delete guests
- [ ] Can send individual invitations
- [ ] Bulk "Send Invitations" button works

### Charities Tab
- [ ] Selected charities display
- [ ] Can add new charity
- [ ] Can remove charity
- [ ] Charity cards show properly

### Donations Tab
- [ ] Donation list displays
- [ ] Shows donor name, amount, charity
- [ ] Total raised calculates correctly
- [ ] Progress bar works (if goal set)

---

## 6️⃣ **Public Event Page (RSVP Flow)**

### RSVP as Guest
- [ ] Open event page (not logged in)
- [ ] Fill out RSVP form:
  - [ ] Name
  - [ ] Email
  - [ ] RSVP status (Attending/Not Attending/Maybe)
  - [ ] Number of guests (if attending)
- [ ] Submit RSVP
- [ ] Success message appears
- [ ] RSVP status updates on page
- [ ] Can change RSVP later (via email link or same email)

### Donation Flow
- [ ] Scroll to donation section
- [ ] **NEW:** Amount input has NO spinner arrows
- [ ] **NEW:** Amount input is large and easy to read
- [ ] Enter donation amount (e.g., $50)
- [ ] Click "Donate Now"
- [ ] Donor info form appears
- [ ] Fill in name and email
- [ ] Click "Continue to [Charity Name]"
- [ ] Opens charity donation page in new tab
- [ ] Success message appears
- [ ] Total raised updates on event page

---

## 7️⃣ **Mobile Responsiveness**

### Navigation
- [ ] **NEW:** Hamburger menu appears on mobile
- [ ] **NEW:** Menu slides open/closed smoothly
- [ ] **NEW:** All menu items visible and clickable
- [ ] **NEW:** Close button works

### Event Page Mobile
- [ ] Hero section stacks properly
- [ ] Charity cards stack vertically
- [ ] Donation input is touch-friendly (min 44px)
- [ ] Buttons are large enough to tap
- [ ] No horizontal scrolling
- [ ] **NEW:** Time displays correctly in 12-hour format

### Dashboard Mobile
- [ ] Stats cards stack properly
- [ ] Event cards are readable
- [ ] **NEW:** All SVG icons display correctly
- [ ] No layout breaks

### Manage Event Mobile
- [ ] **NEW:** Tabs scroll horizontally
- [ ] **NEW:** Tables convert to cards
- [ ] All content readable
- [ ] Buttons accessible

---

## 8️⃣ **Visual Design (NEW)**

### Airbnb-Style Design
- [ ] Clean white backgrounds (not heavy gradients)
- [ ] Professional SVG icons (no emojis except user content)
- [ ] Consistent neutral color palette
- [ ] Clean typography hierarchy
- [ ] Subtle shadows on cards
- [ ] No overwhelming purple/pink everywhere

### Specific Components
- [ ] Buttons have subtle gradients (primary only)
- [ ] Cards have soft shadows
- [ ] Input fields have light borders
- [ ] **NEW:** Stat cards use neutral backgrounds (not blue/green)
- [ ] **NEW:** Commitment cards uniform design

---

## 9️⃣ **Performance & Loading**

### Initial Load
- [ ] **With keep-alive:** Page loads in 1-3 seconds
- [ ] **Without keep-alive:** First load may take 30-60s (cold start)
- [ ] No JavaScript errors in console
- [ ] No broken images
- [ ] No CORS errors

### Navigation
- [ ] Page transitions are smooth
- [ ] No unnecessary re-renders
- [ ] Dashboard data loads efficiently
- [ ] Images are optimized

---

## 🔟 **Edge Cases & Error Handling**

### Network Issues
- [ ] Test with slow 3G (Chrome DevTools → Network tab)
- [ ] Loading states show properly
- [ ] Timeout errors show user-friendly messages
- [ ] Retry logic works for failed requests

### Invalid Data
- [ ] Try submitting forms with invalid email
- [ ] Try negative donation amounts
- [ ] Try future dates for past events
- [ ] Error messages are clear and helpful

### Empty States
- [ ] Dashboard with no events shows helpful message
- [ ] Event with no donations shows "0 donations"
- [ ] Guest list with no guests shows empty state
- [ ] No invitations shows appropriate message

---

## 🐛 **Common Issues to Watch For**

- [ ] Console errors (red text in F12 Console)
- [ ] 404 errors (missing API endpoints)
- [ ] Infinite loading spinners
- [ ] Broken images (missing URLs)
- [ ] Text overflow or cut-off content
- [ ] Buttons that don't respond
- [ ] Forms that don't submit
- [ ] Incorrect time format (should be 12-hour with AM/PM)
- [ ] Number input spinners visible (should be hidden)

---

## ✅ **Browser Testing Matrix**

Test on multiple browsers:

| Browser | Desktop | Mobile |
|---------|---------|--------|
| Chrome | [ ] | [ ] |
| Firefox | [ ] | [ ] |
| Safari | [ ] | [ ] |
| Edge | [ ] | [ ] |

---

## 📱 **Device Testing**

Test on different screen sizes:

| Device Size | Layout OK | Touch Targets OK |
|-------------|-----------|------------------|
| Mobile (320px) | [ ] | [ ] |
| Mobile (375px) | [ ] | [ ] |
| Tablet (768px) | [ ] | [ ] |
| Desktop (1024px) | [ ] | [ ] |
| Large Desktop (1920px) | [ ] | [ ] |

---

## 🚨 **Critical Bugs Found**

Document any critical issues here:

1. 
2. 
3. 

---

## 💡 **Improvement Suggestions**

Note any UX improvements:

1. 
2. 
3. 

---

## ✅ **Sign Off**

- [ ] All critical flows tested and working
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Design looks modern and clean
- [ ] Ready for production ✨

**Tested by:** _________________  
**Date:** _________________  
**Version:** _________________
