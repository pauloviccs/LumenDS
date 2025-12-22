# Auth & Security Implementation Plan

## Goal
Transition the Dashboard from a public access model to a secure, user-authenticated model using Supabase Auth, while ensuring the Player (unauthenticated device) maintains necessary read access.

## User Actions Required
- [ ] Enable **Email Provider** in Supabase Auth Settings.
- [ ] Enable **GitHub Provider** in Supabase Auth Settings (requires Client ID/Secret).

## Proposed Changes

### 1. Dashboard UI
- **[NEW] `apps/dashboard/src/views/LoginView.jsx`**:
    - Email/Password Login Form.
    - "Sign in with GitHub" button.
    - Register (Sign up) link/mode.
- **[MODIFY] `apps/dashboard/src/main.jsx`**: 
    - Add AuthProvider (or simple state check) to determine if <LoginView> or <MainLayout> should be shown.
    - Handle Auth State changes.

### 2. Database RLS Policies (Crucial)
We need to revoke the "force public" policies and replace them with secure ones.

**Screens Table:**
- `SELECT`: Public (Player needs to find screen by pairing_code).
- `INSERT`: Authenticated Users only (`auth.uid()`).
- `UPDATE`: Owner only (`user_id = auth.uid()`) OR Public (Player updating 'online' status/ping).
- `DELETE`: Owner only.

**Playlists Table:**
- `SELECT`: Public (Player needs to download items).
- `INSERT/UPDATE/DELETE`: Owner only (`user_id = auth.uid()`).

### 3. Migration SQL
Create `rules/secure_rls.sql` to:
1. Revoke public permissions.
2. Enable RLS.
3. Add Policies.

## Plan Steps
1. Create `LoginView.jsx`.
2. Integrate Auth in Dashboard Routing.
3. Test Login manually.
4. Apply Secure RLS Policies.
5. Verify Dashboard (CRUD still works for logged user).
6. Verify Player (still works anonymously).
