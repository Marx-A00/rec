# Manual QA Checklist

A comprehensive checklist for manually testing the app from a user's perspective. Walk through each section to find bugs.

---

## 1. AUTHENTICATION

### Registration (`/register`)

- [x] Form shows: username, Email, Password fields
- [x] Email validation rejects invalid formats
- [x] Password strength indicator shows as you type
- [x] Show/hide password toggle works
- [x] Submit with valid data → account created, redirect to sign-in
- [ ] after account creation, google sign up leads to change username page
- [ ] Try existing email → error message
- [ ] Link to sign-in page works
- [x] Tour starts for new users

### Sign In (`/signin`)

- [ ] Google OAuth flow works
- [x] Email/password login works
- [ ] Invalid credentials show error
- [ ] Password visibility toggle works
- [ ] Link to register page works

### Session

- [x] Stay logged in after page refresh
- [ ] Sign out works (header menu)
- [ ] Protected pages redirect to sign-in when logged out

---

## 2. PROFILE

### View Own Profile

- [x] Shows: name, avatar, bio, follower/following counts, rec count, collection count
- [x] Profile tabs are clickable

### View Other User's Profile (`/profile/[userId]`)

- [x] Public profile displays correctly
- [x] Follow button works → count increments, button changes to "Unfollow"
- [x] Unfollow works → count decrements
- [ ] Private profile shows lock icon and "Profile is Private" message
- [ ] Private profile hides collections/recommendations

### Edit Profile (`/settings`)

- [ ] **Profile Tab**: Edit name, bio, save changes, discard changes
- [ ] **Preferences Tab**: Theme, language, notifications
- [ ] **Privacy Tab**: Profile visibility, show activity, show collections, show Listen Later
- [ ] **Account Tab**: View account info, delete account flow
- [ ] Settings persist after refresh

---

## 3. SEARCH & DISCOVERY

### Search (`/search`)

- [x] Search bar in header works
- [x] Type album/artist/track name → results appear
- [x] Filter tabs: Albums, Artists, Tracks, Users
- [x] Results grouped by type (Albums, Singles, EPs, Mixtapes)
- [x] "Load More Results" loads more
- [x] Click album → album details page
- [x] Click artist → artist details page

### Browse (`/browse`)

- [x] Sections display: Welcome, New Users, Top Artists, Most Recommended Albums, Latest Releases
- [x] Click user card → user profile
- [x] Click artist/album card → details page
- [x] Horizontal scroll on album carousels

### Latest Releases (`/latest`)

- [x] Album grid with cover, title, artist, date
- [x] Sort options work: Recently Added, Oldest, Release Date, Title A-Z/Z-A
- [x] Click album → album details

---

## 4. ALBUM DETAILS (`/albums/[id]`)

- [x] Shows: cover art, title, artist (clickable), year, genre, label
- [x] Back button works
- [x] Click artist name → artist details
- [x] **Tracklist tab**: track number, title, duration, artist(s)
- [x] **Recommendations tab**: recs for this album, score, user, other album
- [x] "Add to Collection" button → modal with collection list
- [x] Select collection → album added, success message
- [x] "Add to Listen Later" button works

---

## 5. ARTIST DETAILS (`/artists/[id]`)

- [x] Shows: image, name, disambiguation, country, active years, bio, external links, aliases
- [x] Back button works
- [x] **Discography tab**: albums by type (Studio, EPs, Singles, Mixtapes, Compilations)
- [x] Click album → album details
- [x] **Recommendations tab**: recs for this artist's albums, filter by role, sort options

---

## 6. COLLECTIONS


### Create Collection (`/collections/new`)

- [ ] Form: name (required), description (optional), public/private toggle
- [ ] Create with name only → works
- [ ] Create without name → error
- [ ] Redirect to collection details after create

### Collection Details (`/collections/[id]`)

- [ ] Header: name, description, album count, public/private, creator
- [ ] Own collection: Edit and Delete buttons visible
- [ ] Other user's collection: Edit/Delete NOT visible
- [ ] Albums display with cover, title, artist, year, rating, notes
- [ ] Edit button → change name, description, visibility
- [ ] Reorder albums (drag-and-drop if supported)
- [ ] Remove album from collection → confirmation → removed
- [ ] Delete collection → confirmation → deleted, redirect to collections

### Add Albums to Collection

- [ ] From album details: "Add to Collection" → modal → select collection → added
- [ ] "Create New Collection" option in modal

### Listen Later

- [ ] "Add to Listen Later" on album details → creates Listen Later collection if needed
- [ ] Listen Later appears in collections list
- [ ] Remove from Listen Later works

---

## 7. RECOMMENDATIONS

### Create Recommendation (`/recommend`)

- [x] Shows: search bar, Basis Album card, Recommended Album card, score input
- [x] Search and select basis album → appears in card
- [x] Search and select recommended album → appears in card
- [x] Enter score
- [x] Create → success message, recommendation created

### View Recommendations

- [x] Profile page shows recommendations section
- [x] Album details → Recommendations tab shows recs for that album
- [x] Artist details → Recommendations tab shows recs for artist's albums
- [x] Click recommendation → view details

### Recommendation Details

- [x] Shows: basis album, recommended album, score, creator, date
- [x] Click album → album details
- [x] Click user → user profile

### Edit/Delete Recommendation

- [ ] Own recommendations: edit button → update score → save
- [ ] Own recommendations: delete button → confirmation → deleted

---

## 8. SOCIAL

### Follow/Unfollow

- [ ] On user profile: Follow button → changes to Unfollow, counts update
- [ ] Unfollow → button resets, counts update

### Followers (`/profile/[userId]/followers`)

- [ ] List of followers with avatar, name, counts, follow button
- [ ] Click follower → their profile
- [ ] Follow button works

### Following (`/profile/[userId]/following`)

- [ ] List of users being followed
- [ ] Click user → their profile
- [ ] Unfollow button works

---

## 9. NAVIGATION & HEADER

- [ ] Logo → home
- [ ] Search bar → `/search?q=query`
- [ ] User menu dropdown: profile, settings, sign out
- [ ] Mobile: hamburger menu works, all items accessible
- [ ] Navigation links work: Home, Browse, Search, Collections, Recommend, Profile, Settings
- [ ] Back button works throughout

---

## 10. MOBILE RESPONSIVENESS

- [ ] Resize to 375px width
- [ ] Header adapts (hamburger menu)
- [ ] All pages render correctly on mobile
- [ ] Touch interactions work
- [ ] Images display correctly
- [ ] No horizontal scroll issues

---

## 11. ERROR HANDLING

### Invalid Routes

- [ ] `/albums/invalid-id` → 404 page
- [ ] `/artists/invalid-id` → 404 page
- [ ] `/collections/invalid-id` → 404 page
- [ ] `/profile/invalid-id` → 404 page

### Missing Data

- [ ] Album without cover → placeholder image
- [ ] Artist without bio → page still renders
- [ ] Empty collection → empty state message

### Access Control

- [ ] Other user's private profile → locked, no data visible
- [ ] Can't edit/delete other user's collections (buttons hidden)

### Form Validation

- [ ] Register with existing email → error
- [ ] Register with invalid email → error
- [ ] Create collection without name → error

---

## 12. DATA PERSISTENCE

- [ ] Create collection → refresh → still exists
- [ ] Add album to collection → refresh → still there
- [ ] Create recommendation → refresh → still exists
- [ ] Update settings → refresh → persisted
- [ ] Follow user → refresh → still following
- [ ] Sign out and back in → all data preserved

---

## 13. MODALS & DIALOGS

### Add to Collection Modal

- [ ] Opens on button click
- [ ] Shows collection list
- [ ] "Create New Collection" option
- [ ] Select and add → closes, success message
- [ ] X button closes
- [ ] Click outside closes (if supported)

### Confirmation Dialogs

- [ ] Delete collection → confirm dialog → cancel works, confirm deletes
- [ ] Delete album from collection → confirm dialog works
- [ ] Delete recommendation → confirm dialog works

### Toasts/Notifications

- [ ] Success toast on create recommendation
- [ ] Success toast on add to collection
- [ ] Toasts auto-dismiss or can be dismissed

---

## 14. VISUAL & PERFORMANCE

- [ ] Pages load quickly
- [ ] No stuck loading spinners
- [ ] Images load without lag
- [ ] Consistent colors (cosmic latte highlights, dark theme, zinc grays)
- [ ] Consistent typography
- [ ] Buttons have hover/active states
- [ ] Form inputs have focus states
- [ ] No broken images

---

## 15. COMPLETE USER JOURNEYS

### Journey 1: Discover and Recommend

- [ ] Sign in → Browse → Search artist → View artist → Click album → Create recommendation → Profile shows rec

### Journey 2: Build Collections

- [ ] Sign in → Collections → Create new → Search albums → Add to collection → Edit collection → Set public → View as other user

### Journey 3: Social Engagement

- [ ] User A follows User B → User B's follower count increases → User A sees User B in following list

### Journey 4: Customize Profile

- [ ] Settings → Update name/bio → Change privacy → Change theme → Save → Sign out → Sign in → All settings preserved

---

## 16. BROWSER COMPATIBILITY

Test on:

- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge
- [ ] Chrome Mobile
- [ ] Safari iOS

Check:

- [ ] Page renders without errors
- [ ] Interactive elements work
- [ ] No console errors (F12 → Console)

---

## Bug Categories to Watch

**Data Issues**

- Wrong associations (recs, collections)
- Incorrect counts
- Deleted items still showing

**UI Issues**

- Buttons disabled/enabled incorrectly
- Text overflow
- Images not loading
- Modals not closing
- Infinite scroll not working

**State Issues**

- Data not persisting
- Session lost
- Stale data after update
- Loading spinners stuck

**Navigation Issues**

- Back button broken
- Wrong redirects
- 404s not showing
