# Service Provider Availability Calendar Feature

## Overview
Added comprehensive availability calendar feature allowing service providers (Jeep Drivers & Tour Guides) to mark busy dates, half days, and unavailable dates during registration, and display these statuses to tourists during booking.

## Implementation Summary

### 1. **New Component Created**
- **File**: `src/components/AvailabilityCalendar.jsx`
- **Purpose**: Real-time calendar component for marking availability
- **Features**:
  - Click dates to cycle through statuses: Available → Busy → Half Day → Unavailable
  - Color-coded dates:
    - 🟢 **Green**: Available (default)
    - 🔴 **Red**: Busy
    - 🟡 **Yellow**: Half Day
    - ⚫ **Gray**: Unavailable
  - Past dates disabled
  - Summary counts for each status type
  - Read-only mode for viewing

### 2. **Registration Form Integration** (`src/App.jsx`)

#### Changes Made:
- ✅ Added `AvailabilityCalendar` import
- ✅ Changed `availableDates` state from array to object: `{}`
- ✅ Added calendar section to registration form (for both Jeep Driver & Tour Guide)
- ✅ Updated `handleRegister` to save availability object to Firebase

#### Registration Form Location:
- Calendar appears after "Description" field
- Before "Profile Picture" section
- Visible for both Jeep Driver and Tour Guide registrations

#### Firebase Data Structure:
```javascript
serviceProviders/{userId}/
  availability: {
    "2026-02-15": "busy",
    "2026-02-16": "halfday",
    "2026-02-17": "unavailable",
    // ... more dates
  }
```

### 3. **Profile Page Updates**

#### GuideProfile.jsx:
- ✅ Updated `DatePickerCalendar` component to display availability statuses
- ✅ Added `availabilityCalendar` prop to calendar
- ✅ Updated data loading to include `availabilityCalendar` from Firebase
- ✅ Calendar shows provider's availability with color coding

#### JeepProfile.jsx:
- ✅ Updated `DatePickerCalendar` component to display availability statuses
- ✅ Added `availabilityCalendar` prop to calendar
- ✅ Updated data loading to include `availabilityCalendar` from Firebase
- ✅ Calendar shows provider's availability with color coding

### 4. **Booking Calendar Display**

#### Color Legend (Visible to Tourists):
- 🟢 **Green (Available)**: Date is available for booking
- 🔴 **Red (Busy)**: Provider is busy - not available
- 🟡 **Yellow (Half Day)**: Provider available for half day only
- ⚫ **Gray (Unavailable)**: Provider not available
- ⚪ **Past dates**: Disabled, cannot be selected

#### Location:
- Appears in "Book Now" tab on service provider profile pages
- Shows availability before tourist selects booking dates
- Prevents selection of unavailable dates

## User Flow

### Service Provider Registration:
1. Provider fills registration form
2. Scrolls to "Mark Your Availability" section
3. Clicks dates on calendar to mark:
   - **First click**: Available → Busy (Red)
   - **Second click**: Busy → Half Day (Yellow)
   - **Third click**: Half Day → Unavailable (Gray)
   - **Fourth click**: Unavailable → Available (Green) - cycle restarts
4. Clicks "Register as Provider"
5. Availability data saved to Firebase `availability` field

### Tourist Booking:
1. Tourist navigates to service provider profile
2. Clicks "Book Now" tab
3. Sees calendar with availability statuses:
   - **Red dates**: Cannot select (busy)
   - **Gray dates**: Cannot select (unavailable)
   - **Yellow dates**: Can select (half day)
   - **Green dates**: Can select (available)
4. Selects available dates
5. Proceeds with booking

## Technical Details

### Availability Status Values:
```javascript
'available'   // Default - green, selectable
'busy'        // Red - not available for booking
'halfday'     // Yellow - half day available
'unavailable' // Gray - completely unavailable
```

### Date Key Format:
```javascript
"YYYY-MM-DD"  // ISO date string, e.g., "2026-02-15"
```

### Firebase Field Names:
- **Registration**: `availability` (object mapping dates to status)
- **Legacy Support**: `availableDates` (array) still supported for backward compatibility

## Files Modified

1. ✅ `src/components/AvailabilityCalendar.jsx` - **NEW FILE**
2. ✅ `src/App.jsx` - Registration form integration
3. ✅ `src/components/guides/GuideProfile.jsx` - Booking calendar display
4. ✅ `src/components/jeepdrivers/JeepProfile.jsx` - Booking calendar display

## Testing Checklist

### Registration:
- [ ] Jeep Driver registration shows availability calendar
- [ ] Tour Guide registration shows availability calendar
- [ ] Dates can be clicked to cycle through statuses
- [ ] Colors update correctly (Green → Red → Yellow → Gray → Green)
- [ ] Availability data saves to Firebase on registration

### Booking:
- [ ] Tourist can see availability on guide profile "Book Now" tab
- [ ] Tourist can see availability on jeep driver profile "Book Now" tab
- [ ] Red (busy) dates are not selectable
- [ ] Gray (unavailable) dates are not selectable
- [ ] Yellow (half day) dates are selectable
- [ ] Green (available) dates are selectable
- [ ] Legend displays correctly
- [ ] Calendar navigation works (prev/next month)

### Data Persistence:
- [ ] Availability persists after registration
- [ ] Availability displays correctly after page reload
- [ ] Availability shows correctly for different providers

## Future Enhancements

### Potential Improvements:
1. **Edit Availability**: Allow providers to update availability after registration
2. **Bulk Operations**: Mark multiple dates at once
3. **Recurring Availability**: Set weekly/monthly patterns
4. **Time Slots**: For half days, specify morning/afternoon
5. **Booking Conflict**: Auto-mark dates as busy when booking confirmed
6. **Availability Templates**: Save common availability patterns

## Notes

- **Backward Compatibility**: Old `availableDates` array format still supported
- **Default Behavior**: Unmarked dates default to "available" (green)
- **Past Dates**: Automatically disabled and grayed out
- **Real-time**: Calendar updates immediately as dates are clicked
- **Performance**: Calendar uses efficient date key lookups (O(1))

## Support

For issues or questions:
- Check Firebase console for `availability` field in `serviceProviders` collection
- Verify date format is "YYYY-MM-DD"
- Ensure Calendar icon is imported from lucide-react
- Check browser console for any errors

---

**Status**: ✅ Fully Implemented  
**Last Updated**: January 2026  
**Version**: 1.0.0
