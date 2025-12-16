# AI Builder Prompt: QR Code Feature Implementation

## 🎯 Feature Overview

Implement a **QR Code screen** for the El Colt Loyalty App that displays a unique QR code for each user account. The QR code should encode the user's phone number for identification at point-of-sale terminals.

---

## 📋 Requirements

### 1. New QR Code Screen (`QRCodeView.tsx`)

Create a new component `components/QRCodeView.tsx` that:

- Displays a **large, scannable QR code** containing the user's phone number
- Shows the user's name and phone number below the QR code for reference
- Includes instructional text in Polish explaining how to use the QR code at the store
- Matches the existing app's **dark, premium aesthetic** (forest/slate colors with brass accents)
- Uses the same **Card** component for consistent styling
- Features **smooth animations** on load (using existing `animate-fade-in` and `animate-slide-up` classes)

### 2. Bottom Navigation Integration

Add a new tab to the bottom navigation bar in `Header.tsx`:

- Add a **"QR" or "Kod QR"** tab to both the mobile bottom navigation and desktop navigation
- Position it logically (suggested: between "Panel" and "Historia" or at the end before logout)
- Create matching icons for desktop (`QRCodeIcon`) and mobile (`MobileQRCodeIcon`)
- Follow the existing icon styling (desktop: `w-4 h-4`, mobile: `w-6 h-6`)

### 3. App.tsx Updates

Update the app routing:

- Add `'qrcode'` to the `View` type union: `export type View = 'dashboard' | 'activity' | 'rewards' | 'sales' | 'cart' | 'qrcode';`
- Add the case in `renderView()` switch statement to render `<QRCodeView />`
- Import the new component

### 4. Backend API Updates (`backend/apiRoutes.js`)

Create a new endpoint to fetch user's phone number:

```javascript
/**
 * GET /api/user/qrcode-data
 * Returns the user's phone number for QR code generation.
 * Protected: Requires authentication token.
 */
router.get('/user/qrcode-data', verifyToken, async (req, res) => {
    try {
        const [userData] = await db.query(`
            SELECT u.display_name, m.meta_value as phone
            FROM el1users u
            LEFT JOIN el1usermeta m ON u.ID = m.user_id AND m.meta_key = 'billing_phone'
            WHERE u.ID = ?
        `, [req.userId]);
        
        if (userData.length === 0) {
            return res.status(404).json({ message: 'Nie znaleziono użytkownika.' });
        }
        
        res.json({
            name: userData[0].display_name,
            phone: userData[0].phone || null
        });
    } catch (error) {
        console.error('Get QR code data error:', error);
        res.status(500).json({ message: 'Błąd serwera.' });
    }
});
```

### 5. Frontend API Updates (`services/api.ts`)

Add the API call function:

```typescript
export interface QRCodeData {
  name: string;
  phone: string | null;
}

export const getQRCodeData = async (token: string): Promise<QRCodeData> => {
  const response = await fetch(`${API_BASE_URL}/user/qrcode-data`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return handleResponse(response);
};
```

### 6. QR Code Library

Install and use a QR code generation library:

```bash
npm install qrcode.react
```

---

## 🎨 Design Specifications

### Color Palette (from existing `tailwind.config`)

- **Background**: `bg-slate-950` (base), `bg-slate-900/90` (cards)
- **Primary Accents**: `brass-400` (#D4AF37), `brass-500` (#C9A227)
- **Forest Greens**: `forest-700` (#1B3A2F), `forest-800` (#152B22)
- **Text Colors**: `text-cream` (#F5F0E6), `text-stone-400`, `text-stone-500`
- **Borders**: `border-slate-700/50`

### Typography

- **Headings**: `font-display` (Oswald)
- **Body**: `font-body` (Source Sans 3)
- **Monospace**: `font-mono` (JetBrains Mono) - use for phone number display

### QR Code Styling

- Place QR code on a **white or cream background** for maximum scanability
- Add a subtle **border or shadow** around the QR container
- Consider a **brass/gold accent border** to match branding
- Size: Large enough to scan easily (~256x256px minimum)

### Screen Layout Example

```
┌─────────────────────────────────────┐
│         Twój Kod QR                 │  ← Header text
├─────────────────────────────────────┤
│                                     │
│      ┌─────────────────────┐        │
│      │                     │        │
│      │    [QR CODE HERE]   │        │  ← White/cream background
│      │                     │        │
│      └─────────────────────┘        │
│                                     │
│         [User Name]                 │  ← Display name
│         +48 XXX XXX XXX             │  ← Phone number (formatted)
│                                     │
│   ─────────────────────────────     │
│                                     │
│   Pokaż ten kod pracownikowi        │  ← Instructions
│   przy kasie, aby zdobyć punkty     │
│   lojalnościowe za zakupy.          │
│                                     │
└─────────────────────────────────────┘
```

---

## 🔧 Implementation Details

### QRCodeView.tsx Structure

```tsx
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../hooks/useAuth';
import * as api from '../services/api';
import Card from './Card';
import Spinner from './Spinner';

const QRCodeView: React.FC = () => {
    const { token, user } = useAuth();
    const [qrData, setQrData] = useState<{ name: string; phone: string | null } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchQRData = async () => {
            if (!token) return;
            try {
                setLoading(true);
                const data = await api.getQRCodeData(token);
                setQrData(data);
            } catch (err: any) {
                setError(err.message || 'Failed to load QR data');
            } finally {
                setLoading(false);
            }
        };
        fetchQRData();
    }, [token]);

    // ... render logic with loading, error, and QR code display
};

export default QRCodeView;
```

### Navigation Icon (QR Code)

```tsx
// Desktop Icon
const QRCodeIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h4.5v4.5H3V4.5zM16.5 4.5H21v4.5h-4.5V4.5zM3 16.5h4.5V21H3v-4.5zM16.5 16.5H21V21h-4.5v-4.5zM10.5 4.5h3v3h-3v-3zM4.5 10.5h1.5v1.5H4.5v-1.5zM10.5 10.5h3v3h-3v-3zM16.5 10.5h1.5v1.5h-1.5v-1.5zM10.5 16.5h3v3h-3v-3z" />
  </svg>
);

// Mobile Icon
const MobileQRCodeIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h4.5v4.5H3V4.5zM16.5 4.5H21v4.5h-4.5V4.5zM3 16.5h4.5V21H3v-4.5zM16.5 16.5H21V21h-4.5v-4.5zM10.5 4.5h3v3h-3v-3zM4.5 10.5h1.5v1.5H4.5v-1.5zM10.5 10.5h3v3h-3v-3zM16.5 10.5h1.5v1.5h-1.5v-1.5zM10.5 16.5h3v3h-3v-3z" />
  </svg>
);
```

---

## 📱 Edge Cases to Handle

1. **No Phone Number**: If user doesn't have a phone number on file:
   - Display a message prompting them to add their phone number
   - Consider linking to account settings (future feature)
   - Example text: "Aby wygenerować kod QR, zaktualizuj swój numer telefonu w ustawieniach konta."

2. **Loading State**: Show the standard `Spinner` component while fetching data

3. **Error State**: Display an error message with option to retry

4. **Phone Number Formatting**: Format the phone number nicely for display (e.g., "+48 123 456 789")

---

## 🔒 Security Considerations

1. The QR code should **only contain the phone number** (not sensitive data like passwords or tokens)
2. The API endpoint must be **protected with authentication** (verifyToken middleware)
3. Consider adding **rate limiting** to the QR code endpoint in production

---

## 📂 Files to Create/Modify

### New Files:
- `components/QRCodeView.tsx` - Main QR code display component

### Modified Files:
- `App.tsx` - Add new view type and import
- `components/Header.tsx` - Add navigation tab and icons
- `services/api.ts` - Add API function
- `backend/apiRoutes.js` - Add API endpoint
- `types.ts` - Add new type (optional, can be in api.ts)

---

## ✅ Acceptance Criteria

1. [ ] QR code screen is accessible via bottom navigation bar on mobile
2. [ ] QR code screen is accessible via top navigation on desktop
3. [ ] QR code contains the user's phone number
4. [ ] QR code is large and scannable
5. [ ] Screen matches the existing app's visual design
6. [ ] Polish language throughout (all text in Polish)
7. [ ] Loading and error states are handled gracefully
8. [ ] Works on both mobile and desktop views
9. [ ] Smooth animations on screen load

---

## 🌐 Polish Text Reference

- **Screen Title**: "Twój Kod QR" or "Kod QR"
- **Navigation Tab Label**: "Kod QR" (mobile), "Kod QR" (desktop)
- **Instructions**: "Pokaż ten kod pracownikowi przy kasie, aby zdobyć punkty lojalnościowe za zakupy."
- **No Phone**: "Numer telefonu nie jest przypisany do Twojego konta."
- **Error**: "Nie udało się załadować kodu QR. Spróbuj ponownie."
- **Loading**: (use spinner, no text needed)

---

## 📦 Package to Install

```bash
npm install qrcode.react
```

Add to `package.json` dependencies:
```json
"qrcode.react": "^4.0.1"
```

---

**End of Prompt**
