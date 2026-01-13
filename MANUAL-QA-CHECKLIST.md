# Manual QA Checklist

A comprehensive checklist for manually testing the app from a user's perspective. Walk through each section to find bugs.

---

## 1. AUTHENTICATION

### Registration (`/register`)
- [ ] Form shows: Name, Email, Password fields
- [ ] Email validation rejects invalid formats
- [ ] Password strength indicator shows as you type
- [ ] Show/hide password toggle works
- [ ] Submit with valid data → account created, redirect to sign-in
- [ ] Try existing email → error message
- [ ] Link to sign-in page works

### Sign In (`/signin`)
- [ ] Google OAuth flow works
- [ ] Email/password login works
- [ ] Invalid credentials show error
- [ ] Password visibility toggle works
- [ ] Link to register page works

### Session
- [ ] Stay logged in after page refresh
- [ ] Sign out works (header menu)
- [ ] Protected pages redirect to sign-in when logged out

---

## 2. PROFILE

### View Own Profile
- [ ] Shows: name, avatar, bio, follower/following counts, rec count, collection count
- [ ] Profile tabs are clickable

### View Other User's Profile (`/profile/[userId]`)
- [ ] Public profile displays correctly
- [ ] Follow button works → count increments, button changes to "Unfollow"
- [ ] Unfollow works → count decrements
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
- [ ] Search bar in header works
- [ ] Type album/artist/track name → results appear
- [ ] Filter tabs: Albums, Artists, Tracks, Users
- [ ] Results grouped by type (Albums, Singles, EPs, Mixtapes)
- [ ] "Load More Results" loads more
- [ ] Click album → album details page
- [ ] Click artist → artist details page

### Browse (`/browse`)
- [ ] Sections display: Welcome, New Users, Top Artists, Most Recommended Albums, Latest Releases
- [ ] Click user card → user profile
- [ ] Click artist/album card → details page
- [ ] Horizontal scroll on album carousels

### Latest Releases (`/latest`)
- [ ] Album grid with cover, title, artist, date
- [ ] Sort options work: Recently Added, Oldest, Release Date, Title A-Z/Z-A
- [ ] Click album → album details

---

## 4. ALBUM DETAILS (`/albums/[id]`)

- [ ] Shows: cover art, title, artist (clickable), year, genre, label
- [ ] Back button works
- [ ] Click artist name → artist details
- [ ] **Tracklist tab**: track number, title, duration, artist(s)
- [ ] **Recommendations tab**: recs for this album, score, user, other album
- [ ] "Add to Collection" button → modal with collection list
- [ ] Select collection → album added, success message
- [ ] "Add to Listen Later" button works

---

## 5. ARTIST DETAILS (`/artists/[id]`)

- [ ] Shows: image, name, disambiguation, country, active years, bio, external links, aliases
- [ ] Back button works
- [ ] **Discography tab**: albums by type (Studio, EPs, Singles, Mixtapes, Compilations)
- [ ] Click album → album details
- [ ] **Recommendations tab**: recs for this artist's albums, filter by role, sort options

---

## 6. COLLECTIONS

### View Collections (`/collections`)
- [ ] "Your Collections" header
- [ ] "New Collection" button
- [ ] Collection cards show: name, description, album count, public/private badge
- [ ] Click collection → collection details

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
- [ ] Shows: search bar, Basis Album card, Recommended Album card, score input
- [ ] Search and select basis album → appears in card
- [ ] Search and select recommended album → appears in card
- [ ] Enter score
- [ ] Create → success message, recommendation created

### View Recommendations
- [ ] Profile page shows recommendations section
- [ ] Album details → Recommendations tab shows recs for that album
- [ ] Artist details → Recommendations tab shows recs for artist's albums
- [ ] Click recommendation → view details

### Recommendation Details
- [ ] Shows: basis album, recommended album, score, creator, date
- [ ] Click album → album details
- [ ] Click user → user profile

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
