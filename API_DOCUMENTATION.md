# KMRGP Mobile API Documentation

All endpoints are under `/api/v1/` and live on the existing Next.js / Vercel deployment.

## Base URL

```
Production:  https://kmrgp.com/api/v1
Development: http://<LAN_IP>:4024/api/v1
```

## Response Envelope

All endpoints return a consistent JSON envelope:

**Success:**
```json
{ "success": true, "data": { ... }, "message": "..." }
```

**Error:**
```json
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human-readable message" } }
```

## Authentication

Authenticated endpoints require:
```
Authorization: Bearer <jwt_token>
```

Token is obtained from `/api/v1/auth/login` or `/api/v1/auth/register`.  
Token lifetime: 7 days. Store in device SecureStore — never in plain AsyncStorage.

---

## Auth Endpoints

### POST /api/v1/auth/login
Login with phone or username.

**Body:** `{ "loginId": "9876543210", "password": "secret" }`  
**Response 200:** `{ token, user: { id, phone, username, role, isApproved } }`  
**Error 401:** Invalid credentials

---

### POST /api/v1/auth/logout
Logout (invalidates nothing server-side — client must delete token).

**Auth:** Bearer  
**Response 200:** `{ null, "Logged out successfully" }`

---

### GET /api/v1/auth/me
Returns current authenticated user. Use on app startup to verify token.

**Auth:** Bearer  
**Response 200:** `{ id, phone, username, role, isApproved }`  
**Error 401:** Expired/invalid token

---

### POST /api/v1/auth/register
Free-plan registration. Returns 402 if payment is required.

**Body:** `{ phone, username, password, profileType, dob?, gotraSelf?, gotraMother?, education?, profession?, district?, community? }`  
**Response 201:** `{ token, user }`  
**Error 402:** Payment required — use `/api/v1/payment/order` instead  
**Error 409:** Phone already registered

---

## Payment Endpoints

### GET /api/v1/payment/plan
Returns the active registration plan. No auth required.

**Response 200:** `{ required: true, plan: { id, name, amountInr, durationDays } }` or `{ required: false, plan: null }`

---

### POST /api/v1/payment/order
Creates a payment order for paid registration. No auth required.

**Body:** Same fields as `/auth/register`  
**Response 201:** `{ orderRef, amountInr, planName, planDurationDays }`  
**Error 409:** Phone already registered

---

### POST /api/payment/screenshot *(pre-auth endpoint — not under /v1/)*
Upload UPI payment screenshot. No auth — identified by orderRef.

**Body:** `multipart/form-data` — `file` (image) + `orderRef` (string)  
**Response 201:** `{ screenshotUrl }`

---

### POST /api/v1/payment/complete
Complete registration after screenshot upload. Creates user account.

**Body:** `{ "orderRef": "kmrgp-..." }`  
**Response 200:** `{ token, user, alreadyRegistered }`  
**Error 400:** Screenshot not yet uploaded

---

### GET /api/v1/payment/status
Returns payment order status for authenticated user.

**Auth:** Bearer  
**Response 200:** `{ hasOrder, status, orderRef, amountInr, screenshotUploaded, paidAt }`

---

## Profile Endpoints

### GET /api/v1/profile/me
Returns the authenticated user's own full profile.

**Auth:** Bearer  
**Response 200:** PublicProfile + profileId  
**Error 404:** Profile not found

---

### PATCH /api/v1/profile/update
Update profile bio-data fields.

**Auth:** Bearer  
**Body:** Any subset of profile fields (dob, height, gotraSelf, gotraMother, education, profession, district, community, fatherName, motherName, fatherOccupation, motherOccupation, address, contact, brothers, sisters, familyType, parentsOccupation, gender, currentEducation, companyName, guardianMobile, whatsappNumber, hobbies, additionalDetails, bio, username, type, visible)  
**Response 200:** `{ profile: PublicProfile }`

---

### POST /api/v1/profile/submit
Submit profile for admin verification (SENT/REJECTED → PENDING).

**Auth:** Bearer  
**Response 200:** `{ profile: PublicProfile }`  
**Error 400:** Already pending or approved

---

### GET /api/v1/profile/stats
Dashboard stats for the authenticated user.

**Auth:** Bearer  
**Response 200:** `{ profileViews, interestsReceived, acceptedMatches, pendingInterests }`

---

### POST /api/v1/profile/upload
Upload profile photo or cast certificate.

**Auth:** Bearer  
**Body:** `multipart/form-data` — `file` (image or PDF) + `kind` ("photo" | "cast")  
**Response 201:** `{ imageUrl, kind }` or `{ fileUrl, kind }`

---

## Profiles Browse

### GET /api/v1/profiles
Paginated, filtered profile search. Only approved non-seed profiles.

**Auth:** Bearer  
**Query params:** `page, pageSize, gender (groom|bride|all), ageMin, ageMax, community, district, gotraQuery, gotraExclude, keyword, heightMin, sort`  
**Response 200:** `{ profiles[], total, page, pageSize, totalPages }`

---

### GET /api/v1/profiles/:userId
Single profile by userId.

**Auth:** Bearer  
**Response 200:** PublicProfile (contact stripped)  
**Error 404:** Not found or not approved

---

## Interests

### GET /api/v1/interests?type=received|sent|accepted
**Auth:** Bearer  
**Response 200:**
- received: `{ interests[], count }`
- sent: `{ interests[] }`
- accepted: `{ received[], sent[] }`

### POST /api/v1/interests
Send a marriage interest.

**Auth:** Bearer  
**Body:** `{ "receiverId": number }`  
**Response 200:** `{ alreadySent }`

### PATCH /api/v1/interests/:interestId
Accept or decline a received interest.

**Auth:** Bearer  
**Body:** `{ "action": "ACCEPTED" | "DECLINED" }`  
**Response 200:** OK

### GET /api/v1/interests/counts
**Auth:** Bearer  
**Response 200:** `{ pending, accepted }`

---

## Contact Requests

### POST /api/v1/contact
Request contact details (admin-mediated).

**Auth:** Bearer  
**Body:** `{ "ownerId": number }`  
**Response 200:** `{ status: "PENDING" }`

### GET /api/v1/contact/status?ownerId=
**Auth:** Bearer  
**Response 200:** `{ status: "PENDING"|"APPROVED"|"REJECTED"|null, contact: string|null }`

### GET /api/v1/contact/admin-phone
Returns admin helpline number. No auth required.  
**Response 200:** `{ phone: string|null }`

---

## Admin Endpoints (ADMIN / SUPER_ADMIN only)

### GET /api/v1/admin/members?status=pending|rejected|all
### POST /api/v1/admin/approve — `{ userId, showPublic?, featureOnHome? }`
### POST /api/v1/admin/reject — `{ userId }`
### DELETE /api/v1/admin/delete — `{ userId }`
### GET /api/v1/admin/payment-screenshot?userId=
### GET /api/v1/admin/contact-requests
### PATCH /api/v1/admin/contact-requests — `{ requestId, action: "APPROVE"|"REJECT" }`

---

## HTTP Status Codes

| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 400 | Bad request / validation failed |
| 401 | Not authenticated |
| 402 | Payment required |
| 403 | Forbidden (role check failed) |
| 404 | Not found |
| 409 | Conflict (duplicate) |
| 500 | Server error |
