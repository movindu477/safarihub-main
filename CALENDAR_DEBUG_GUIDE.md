# 📅 Calendar Debug Guide

## Why You See "1 accepted booking(s) • 0 busy date(s) marked"

This means:
- ✅ The booking is accepted
- ❌ But the date wasn't synced to the calendar

## Quick Fix Steps

### 1. Open Browser Console (F12)
Press F12 to open developer tools and go to the Console tab

### 2. Accept the Booking Again
Go to "My Bookings" → Click "Accept" on the booking again

### 3. Check Console for Logs
Look for these messages:
```
📅 Updating availability for accepted booking: {...}
📅 Full booking object: {...}
✅ Marked 2026-01-22 as BUSY (full day)
✅ Availability calendar updated successfully
```

### 4. If You See Errors
Look for:
```
⚠️ No booking dates found in booking object!
❌ Failed to process any dates from booking
```

## What the Colors Mean

### 🔴 RED (Busy)
- **What:** Dates marked as busy in Firestore
- **When:** After accepting a full-day booking
- **Shows:** `busy` status in availability field

### 🔵 BLUE (Accepted Booking - Locked)
- **What:** Dates from accepted bookings (locked, can't edit)
- **When:** Shows dates from bookings with status="accepted"
- **Shows:** Lock icon, prevents editing
- **Purpose:** Protection against accidentally editing booked dates

### Difference:
- **RED** = Availability database says "busy"
- **BLUE** = Booking exists and is accepted (regardless of availability)

## If Jan 22nd Doesn't Show

### Option 1: Re-accept the Booking
1. Go to "My Bookings"
2. Find the booking for Jan 22
3. Click "Accept" again (it will update the calendar)

### Option 2: Manual Mark (Edit Calendar)
1. Go to "Availability" tab
2. Click "Edit Calendar"
3. Click on Jan 22
4. Select "Unavailable" → "Full Day"
5. Click "Save Calendar"

### Option 3: Check Console for Booking Data
1. Press F12
2. In console, type: `console.log(bookings)`
3. Find the booking for Jan 22
4. Check if it has date fields

## Common Issues

### Issue: Booking accepted but date not showing
**Cause:** Date field might be missing or in wrong format
**Fix:** Check console logs when accepting

### Issue: Shows "0 busy dates" but booking exists
**Cause:** Availability database not updated
**Fix:** Re-accept the booking

### Issue: Date shows as empty (not blue or red)
**Cause:** Neither availability database nor booking query found it
**Fix:** Check if booking status is really "accepted"
